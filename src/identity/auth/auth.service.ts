import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyEmailResponseDto } from './dto/verify-email-response.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { OtpService } from './otp/otp.service';
import { OtpType } from './otp/enums/otp-type.enum';
import {
  MAIL_SERVICE,
  type IMailService,
} from 'src/common/mail/mail.service.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    @Inject(MAIL_SERVICE)
    private readonly mailService: IMailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const normalizedEmail = registerDto.email.trim().toLowerCase();
    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const createdUser = await this.usersService.create({
      name: registerDto.name.trim(),
      email: normalizedEmail,
      password: registerDto.password,
      roles: [UserRole.USER],
      status: UserStatus.PENDING_VERIFICATION,
      identities: [],
    });

    const otp = await this.otpService.generateAndSaveOtp(
      createdUser.email,
      OtpType.EMAIL_VERIFICATION,
    );
    await this.mailService.sendOtpEmail(createdUser.email, otp);

    return {
      user: createdUser,
    };
  }

  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
  ): Promise<VerifyEmailResponseDto> {
    const normalizedEmail = verifyEmailDto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Email is already verified');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('User account is blocked');
    }

    await this.otpService.validateOtp(
      user.email,
      verifyEmailDto.otp,
      OtpType.EMAIL_VERIFICATION,
    );

    const updatedUser =
      (await this.usersService.update(user.id, {
        status: UserStatus.ACTIVE,
      })) ?? user;

    const payload = {
      sub: updatedUser.uid,
      email: updatedUser.email,
      roles: updatedUser.roles,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      user: updatedUser,
      accessToken,
    };
  }

  async resendOtp(resendOtpDto: ResendOtpDto): Promise<void> {
    const normalizedEmail = resendOtpDto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Email is already verified');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('User account is blocked');
    }

    const otp = await this.otpService.generateAndSaveOtp(
      user.email,
      OtpType.EMAIL_VERIFICATION,
    );
    await this.mailService.sendOtpEmail(user.email, otp);
  }
}
