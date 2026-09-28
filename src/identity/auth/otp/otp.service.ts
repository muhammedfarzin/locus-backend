import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  OTP_REPOSITORY,
  type IOtpRepository,
} from './repositories/otp.repository.interface';
import {
  HASHING_SERVICE,
  type IHashingService,
} from 'src/common/hashing/hashing.service.interface';
import { OtpType } from './enums/otp-type.enum';

export interface GenerateOtpOptions {
  expirationMinutes?: number;
  length?: number;
  cooldownSeconds?: number;
  maxResendAttempts?: number;
  lockoutMinutes?: number;
}

@Injectable()
export class OtpService {
  private readonly defaultExpirationMinutes = 10;
  private readonly defaultOtpLength = 6;
  private readonly defaultMaxAttempts = 5;
  private readonly defaultCooldownSeconds = 60;
  private readonly defaultMaxResendAttempts = 3;
  private readonly defaultLockoutMinutes = 15;

  constructor(
    @Inject(OTP_REPOSITORY)
    private readonly otpRepository: IOtpRepository,
    @Inject(HASHING_SERVICE)
    private readonly hashingService: IHashingService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generates a cryptographically secure numeric OTP and stores its hash with expiration.
   * Enforces cooldown rate-limiting and maximum resend lockout to prevent OTP exploitation.
   *
   * @param identifier Target recipient identifier (e.g., email address, mobile/phone number).
   * @param type Purpose of the OTP (defaults to EMAIL_VERIFICATION).
   * @param options Configurable options such as custom expiration, length, cooldown, and limits.
   * @returns Plaintext OTP to be dispatched via the designated channel (Email, SMS, etc.).
   */
  async generateAndSaveOtp(
    identifier: string,
    type: OtpType = OtpType.EMAIL_VERIFICATION,
    options?: GenerateOtpOptions,
  ): Promise<string> {
    const now = new Date();
    const existingOtp = await this.otpRepository.findByIdentifierAndType(
      identifier,
      type,
    );

    const cooldownSeconds =
      options?.cooldownSeconds ??
      this.configService.get<number>(
        'OTP_RESEND_COOLDOWN_SECONDS',
        this.defaultCooldownSeconds,
      );
    const maxResendAttempts =
      options?.maxResendAttempts ??
      this.configService.get<number>(
        'OTP_MAX_RESEND_ATTEMPTS',
        this.defaultMaxResendAttempts,
      );
    const lockoutMinutes =
      options?.lockoutMinutes ??
      this.configService.get<number>(
        'OTP_LOCKOUT_MINUTES',
        this.defaultLockoutMinutes,
      );

    let resendCount = 0;

    if (existingOtp) {
      const lastSentAt = existingOtp.updatedAt ?? existingOtp.createdAt;

      // 1. Check if recipient has reached maximum resend attempts and is within lockout window
      if (existingOtp.resendCount >= maxResendAttempts && lastSentAt) {
        const lockoutEndsAt = new Date(
          lastSentAt.getTime() + lockoutMinutes * 60 * 1000,
        );
        if (now < lockoutEndsAt) {
          const remainingMs = lockoutEndsAt.getTime() - now.getTime();
          const remainingMinutes = Math.max(
            1,
            Math.ceil(remainingMs / (60 * 1000)),
          );
          throw new HttpException(
            {
              message: `Too many OTP requests. Please wait ${remainingMinutes} minute(s) before requesting a new verification code`,
              error: 'Too Many Requests',
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      // 2. Check if the request is within the cooldown period (e.g., 60 seconds)
      if (lastSentAt) {
        const elapsedMs = now.getTime() - lastSentAt.getTime();
        const cooldownMs = cooldownSeconds * 1000;
        if (elapsedMs < cooldownMs) {
          const secondsLeft = Math.max(
            1,
            Math.ceil((cooldownMs - elapsedMs) / 1000),
          );
          throw new HttpException(
            {
              message: `Please wait ${secondsLeft} second(s) before requesting a new verification code`,
              error: 'Too Many Requests',
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      // 3. Determine resend count: increment if previous OTP is still valid and under max attempts
      if (
        now < existingOtp.expiresAt &&
        existingOtp.resendCount < maxResendAttempts
      ) {
        resendCount = existingOtp.resendCount + 1;
      }
    }

    const length = options?.length ?? this.defaultOtpLength;
    const max = Math.pow(10, length);
    const otp = crypto.randomInt(0, max).toString().padStart(length, '0');

    const expirationMinutes =
      options?.expirationMinutes ??
      this.configService.get<number>(
        'OTP_EXPIRATION_MINUTES',
        this.defaultExpirationMinutes,
      );

    const effectiveExpirationMinutes =
      resendCount >= maxResendAttempts
        ? Math.max(expirationMinutes, lockoutMinutes)
        : expirationMinutes;
    const expiresAt = new Date(
      now.getTime() + effectiveExpirationMinutes * 60 * 1000,
    );

    const codeHash = await this.hashingService.hash(otp);
    await this.otpRepository.createOrUpdate(identifier, type, {
      codeHash,
      expiresAt,
      attempts: 0,
      resendCount,
    });

    return otp;
  }

  /**
   * Validates an OTP code for a given recipient identifier and purpose.
   *
   * @param identifier Recipient identifier (e.g., email address, mobile/phone number).
   * @param code Plaintext code submitted by the user.
   * @param type Purpose of the OTP (defaults to EMAIL_VERIFICATION).
   */
  async validateOtp(
    identifier: string,
    code: string,
    type: OtpType = OtpType.EMAIL_VERIFICATION,
  ): Promise<void> {
    const otpEntity = await this.otpRepository.findByIdentifierAndType(
      identifier,
      type,
    );

    if (!otpEntity || new Date() > otpEntity.expiresAt) {
      throw new BadRequestException(
        'Verification code has expired or is invalid',
      );
    }

    if (otpEntity.attempts >= this.defaultMaxAttempts) {
      await this.otpRepository.deleteByIdentifierAndType(identifier, type);
      throw new BadRequestException(
        'Maximum verification attempts exceeded. Please request a new code.',
      );
    }

    const isValid = await this.hashingService.compare(code, otpEntity.codeHash);
    if (!isValid) {
      await this.otpRepository.incrementAttempts(otpEntity.id);
      throw new BadRequestException('Invalid verification code');
    }

    await this.otpRepository.deleteByIdentifierAndType(identifier, type);
  }
}
