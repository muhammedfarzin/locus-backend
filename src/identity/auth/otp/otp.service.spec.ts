import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpService } from './otp.service';
import { OTP_REPOSITORY } from './repositories/otp.repository.interface';
import { HASHING_SERVICE } from 'src/common/hashing/hashing.service.interface';
import { OtpEntity } from './entities/otp.entity';
import { OtpType } from './enums/otp-type.enum';
import * as crypto from 'crypto';

jest.mock('crypto', () => {
  const actual = jest.requireActual<typeof import('crypto')>('crypto');
  return {
    __esModule: true,
    ...actual,
    randomInt: jest.fn((...args: unknown[]) =>
      (actual.randomInt as (...a: unknown[]) => number)(...args),
    ),
  };
});

describe('OtpService', () => {
  let service: OtpService;
  let mockOtpRepository: {
    createOrUpdate: jest.Mock;
    findByIdentifierAndType: jest.Mock;
    incrementAttempts: jest.Mock;
    deleteByIdentifierAndType: jest.Mock;
  };
  let mockHashingService: {
    hash: jest.Mock;
    compare: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  beforeEach(async () => {
    mockOtpRepository = {
      createOrUpdate: jest.fn().mockResolvedValue({}),
      findByIdentifierAndType: jest.fn().mockResolvedValue(null),
      incrementAttempts: jest.fn().mockResolvedValue({}),
      deleteByIdentifierAndType: jest.fn().mockResolvedValue(undefined),
    };

    mockHashingService = {
      hash: jest.fn().mockResolvedValue('hashed-otp'),
      compare: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'OTP_EXPIRATION_MINUTES') return 10;
        if (key === 'OTP_RESEND_COOLDOWN_SECONDS') return 60;
        if (key === 'OTP_MAX_RESEND_ATTEMPTS') return 3;
        if (key === 'OTP_LOCKOUT_MINUTES') return 15;
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: OTP_REPOSITORY,
          useValue: mockOtpRepository,
        },
        {
          provide: HASHING_SERVICE,
          useValue: mockHashingService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAndSaveOtp', () => {
    it('should generate a 6-digit OTP for email, hash it, and save it for the first time', async () => {
      const email = 'user@example.com';
      const otp = await service.generateAndSaveOtp(
        email,
        OtpType.EMAIL_VERIFICATION,
      );

      expect(otp).toMatch(/^[0-9]{6}$/);
      expect(mockHashingService.hash).toHaveBeenCalledWith(otp);
      expect(mockOtpRepository.createOrUpdate).toHaveBeenCalledWith(
        email,
        OtpType.EMAIL_VERIFICATION,
        expect.objectContaining({
          codeHash: 'hashed-otp',
          attempts: 0,
          resendCount: 0,
          expiresAt: expect.any(Date),
        }),
      );
    });

    it('should throw 429 when requesting resend within cooldown interval', async () => {
      const email = 'user@example.com';
      mockOtpRepository.findByIdentifierAndType.mockResolvedValueOnce(
        new OtpEntity({
          id: 'otp-id',
          identifier: email,
          type: OtpType.EMAIL_VERIFICATION,
          codeHash: 'existing-hash',
          attempts: 0,
          resendCount: 0,
          updatedAt: new Date(Date.now() - 20 * 1000), // 20s ago (within 60s cooldown)
          expiresAt: new Date(Date.now() + 500000),
        }),
      );

      await expect(
        service.generateAndSaveOtp(email, OtpType.EMAIL_VERIFICATION),
      ).rejects.toThrow(HttpException);

      try {
        await service.generateAndSaveOtp(email, OtpType.EMAIL_VERIFICATION);
      } catch (err) {
        const error = err as HttpException;
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect((error.getResponse() as any).message).toMatch(
          /Please wait \d+ second\(s\) before requesting a new verification code/,
        );
      }
    });

    it('should increment resendCount when resending after cooldown passes', async () => {
      const email = 'user@example.com';
      mockOtpRepository.findByIdentifierAndType.mockResolvedValueOnce(
        new OtpEntity({
          id: 'otp-id',
          identifier: email,
          type: OtpType.EMAIL_VERIFICATION,
          codeHash: 'existing-hash',
          attempts: 0,
          resendCount: 1,
          updatedAt: new Date(Date.now() - 70 * 1000), // 70s ago (cooldown passed)
          expiresAt: new Date(Date.now() + 500000),
        }),
      );

      await service.generateAndSaveOtp(email, OtpType.EMAIL_VERIFICATION);

      expect(mockOtpRepository.createOrUpdate).toHaveBeenCalledWith(
        email,
        OtpType.EMAIL_VERIFICATION,
        expect.objectContaining({
          resendCount: 2,
        }),
      );
    });

    it('should throw 429 when max resend attempts are exceeded within lockout window', async () => {
      const email = 'user@example.com';
      mockOtpRepository.findByIdentifierAndType.mockResolvedValueOnce(
        new OtpEntity({
          id: 'otp-id',
          identifier: email,
          type: OtpType.EMAIL_VERIFICATION,
          codeHash: 'existing-hash',
          attempts: 0,
          resendCount: 3, // reached max (3)
          updatedAt: new Date(Date.now() - 70 * 1000), // 70s ago, within 15m lockout
          expiresAt: new Date(Date.now() + 500000),
        }),
      );

      await expect(
        service.generateAndSaveOtp(email, OtpType.EMAIL_VERIFICATION),
      ).rejects.toThrow(HttpException);

      try {
        await service.generateAndSaveOtp(email, OtpType.EMAIL_VERIFICATION);
      } catch (err) {
        const error = err as HttpException;
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect((error.getResponse() as any).message).toMatch(
          /Too many OTP requests\. Please wait \d+ minute\(s\)/,
        );
      }
    });

    it('should allow new OTP generation and reset resendCount when lockout period has passed', async () => {
      const email = 'user@example.com';
      mockOtpRepository.findByIdentifierAndType.mockResolvedValueOnce(
        new OtpEntity({
          id: 'otp-id',
          identifier: email,
          type: OtpType.EMAIL_VERIFICATION,
          codeHash: 'existing-hash',
          attempts: 0,
          resendCount: 3,
          updatedAt: new Date(Date.now() - 16 * 60 * 1000), // 16m ago (> 15m lockout)
          expiresAt: new Date(Date.now() - 60 * 1000),
        }),
      );

      await service.generateAndSaveOtp(email, OtpType.EMAIL_VERIFICATION);

      expect(mockOtpRepository.createOrUpdate).toHaveBeenCalledWith(
        email,
        OtpType.EMAIL_VERIFICATION,
        expect.objectContaining({
          resendCount: 0,
        }),
      );
    });

    it('should support custom length and expiration options for identifiers', async () => {
      const phone = '+1234567890';
      const otp = await service.generateAndSaveOtp(
        phone,
        OtpType.EMAIL_VERIFICATION,
        { length: 4, expirationMinutes: 5 },
      );

      expect(otp).toMatch(/^[0-9]{4}$/);
      expect(mockHashingService.hash).toHaveBeenCalledWith(otp);
      expect(mockOtpRepository.createOrUpdate).toHaveBeenCalledWith(
        phone,
        OtpType.EMAIL_VERIFICATION,
        expect.objectContaining({
          codeHash: 'hashed-otp',
        }),
      );
    });

    it('should format OTP with leading zeros when generated value has fewer digits (e.g. 0620)', async () => {
      (crypto.randomInt as unknown as jest.Mock).mockReturnValueOnce(620);

      const otp = await service.generateAndSaveOtp(
        'user@example.com',
        OtpType.EMAIL_VERIFICATION,
        { length: 4 },
      );

      expect(otp).toBe('0620');
      expect(otp).toHaveLength(4);
    });
  });

  describe('validateOtp', () => {
    const identifier = 'user@example.com';
    const code = '123456';

    it('should successfully validate OTP and delete it', async () => {
      mockOtpRepository.findByIdentifierAndType.mockResolvedValue(
        new OtpEntity({
          id: 'otp-id',
          identifier,
          type: OtpType.EMAIL_VERIFICATION,
          codeHash: 'hashed-otp',
          attempts: 0,
          expiresAt: new Date(Date.now() + 60000),
        }),
      );
      mockHashingService.compare.mockResolvedValue(true);

      await expect(
        service.validateOtp(identifier, code, OtpType.EMAIL_VERIFICATION),
      ).resolves.not.toThrow();

      expect(mockHashingService.compare).toHaveBeenCalledWith(
        code,
        'hashed-otp',
      );
      expect(mockOtpRepository.deleteByIdentifierAndType).toHaveBeenCalledWith(
        identifier,
        OtpType.EMAIL_VERIFICATION,
      );
    });

    it('should throw BadRequestException if OTP not found', async () => {
      mockOtpRepository.findByIdentifierAndType.mockResolvedValue(null);

      await expect(
        service.validateOtp(identifier, code, OtpType.EMAIL_VERIFICATION),
      ).rejects.toThrow(
        new BadRequestException('Verification code has expired or is invalid'),
      );
    });

    it('should throw BadRequestException if OTP is expired', async () => {
      mockOtpRepository.findByIdentifierAndType.mockResolvedValue(
        new OtpEntity({
          id: 'otp-id',
          identifier,
          type: OtpType.EMAIL_VERIFICATION,
          codeHash: 'hashed-otp',
          attempts: 0,
          expiresAt: new Date(Date.now() - 1000),
        }),
      );

      await expect(
        service.validateOtp(identifier, code, OtpType.EMAIL_VERIFICATION),
      ).rejects.toThrow(
        new BadRequestException('Verification code has expired or is invalid'),
      );
    });

    it('should throw and delete OTP if attempts >= 5', async () => {
      mockOtpRepository.findByIdentifierAndType.mockResolvedValue(
        new OtpEntity({
          id: 'otp-id',
          identifier,
          type: OtpType.EMAIL_VERIFICATION,
          codeHash: 'hashed-otp',
          attempts: 5,
          expiresAt: new Date(Date.now() + 60000),
        }),
      );

      await expect(
        service.validateOtp(identifier, code, OtpType.EMAIL_VERIFICATION),
      ).rejects.toThrow(
        new BadRequestException(
          'Maximum verification attempts exceeded. Please request a new code.',
        ),
      );

      expect(mockOtpRepository.deleteByIdentifierAndType).toHaveBeenCalledWith(
        identifier,
        OtpType.EMAIL_VERIFICATION,
      );
    });

    it('should increment attempts and throw if code does not match', async () => {
      mockOtpRepository.findByIdentifierAndType.mockResolvedValue(
        new OtpEntity({
          id: 'otp-id',
          identifier,
          type: OtpType.EMAIL_VERIFICATION,
          codeHash: 'hashed-otp',
          attempts: 1,
          expiresAt: new Date(Date.now() + 60000),
        }),
      );
      mockHashingService.compare.mockResolvedValue(false);

      await expect(
        service.validateOtp(identifier, '999999', OtpType.EMAIL_VERIFICATION),
      ).rejects.toThrow(new BadRequestException('Invalid verification code'));

      expect(mockOtpRepository.incrementAttempts).toHaveBeenCalledWith(
        'otp-id',
      );
      expect(
        mockOtpRepository.deleteByIdentifierAndType,
      ).not.toHaveBeenCalled();
    });
  });
});
