import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { UserEntity } from '../users/entities/user.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { RegisterDto } from './dto/register.dto';
import { OtpService } from './otp/otp.service';
import { OtpType } from './otp/enums/otp-type.enum';
import { MAIL_SERVICE } from '../../common/mail/mail.service.interface';

function createMockUserEntity(data: Partial<UserEntity>): UserEntity {
  return new UserEntity({
    id: data.id ?? 'mock-id',
    uid: data.uid ?? 'mock-uid',
    name: data.name ?? '',
    email: data.email ?? '',
    roles: data.roles ?? [UserRole.USER],
    status: data.status ?? UserStatus.PENDING_VERIFICATION,
    passwordHash: data.passwordHash ?? '',
    identities: data.identities ?? [],
  });
}

describe('AuthService', () => {
  let service: AuthService;
  let findByEmailMock: jest.Mock<Promise<UserEntity | null>, [string]>;
  let createMock: jest.Mock<Promise<UserEntity>, [CreateUserDto]>;
  let updateMock: jest.Mock;
  let signAsyncMock: jest.Mock<Promise<string>, [Record<string, unknown>]>;
  let generateAndSaveOtpMock: jest.Mock;
  let validateOtpMock: jest.Mock;
  let sendOtpEmailMock: jest.Mock;

  beforeEach(async () => {
    findByEmailMock = jest.fn<Promise<UserEntity | null>, [string]>();
    createMock = jest.fn<Promise<UserEntity>, [CreateUserDto]>();
    updateMock = jest.fn();
    signAsyncMock = jest
      .fn<Promise<string>, [Record<string, unknown>]>()
      .mockResolvedValue('mock-jwt-token');

    generateAndSaveOtpMock = jest.fn().mockResolvedValue('123456');
    validateOtpMock = jest.fn().mockResolvedValue(undefined);
    sendOtpEmailMock = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: findByEmailMock,
            create: createMock,
            update: updateMock,
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: signAsyncMock,
          },
        },
        {
          provide: OtpService,
          useValue: {
            generateAndSaveOtp: generateAndSaveOtpMock,
            validateOtp: validateOtpMock,
          },
        },
        {
          provide: MAIL_SERVICE,
          useValue: {
            sendOtpEmail: sendOtpEmailMock,
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register user with PENDING_VERIFICATION, generate OTP, send email, and return user', async () => {
      findByEmailMock.mockResolvedValue(null);
      createMock.mockImplementation((userData: CreateUserDto) =>
        Promise.resolve(createMockUserEntity(userData)),
      );

      const registerDto: RegisterDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
      };

      const result = await service.register(registerDto);

      expect(findByEmailMock).toHaveBeenCalledWith('john@example.com');
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'Password123!',
          roles: [UserRole.USER],
          status: UserStatus.PENDING_VERIFICATION,
          identities: [],
        }),
      );
      expect(generateAndSaveOtpMock).toHaveBeenCalledWith(
        'john@example.com',
        OtpType.EMAIL_VERIFICATION,
      );
      expect(sendOtpEmailMock).toHaveBeenCalledWith(
        'john@example.com',
        '123456',
      );
      expect(result.user.roles).toEqual([UserRole.USER]);
      expect(result.user.status).toBe(UserStatus.PENDING_VERIFICATION);
    });

    it('should normalize email to lowercase and trim spaces in name and email', async () => {
      findByEmailMock.mockResolvedValue(null);
      createMock.mockImplementation((userData: CreateUserDto) =>
        Promise.resolve(createMockUserEntity(userData)),
      );

      const registerDto: RegisterDto = {
        name: '  Jane Doe  ',
        email: '  Jane.Doe@EXAMPLE.COM  ',
        password: 'Password123!',
      };

      const result = await service.register(registerDto);

      expect(findByEmailMock).toHaveBeenCalledWith('jane.doe@example.com');
      expect(result.user.email).toBe('jane.doe@example.com');
    });

    it('should throw ConflictException if email is already taken', async () => {
      findByEmailMock.mockResolvedValue(
        createMockUserEntity({ email: 'taken@example.com' }),
      );

      const registerDto = {
        name: 'Jane Doe',
        email: 'taken@example.com',
        password: 'Password123!',
      };

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(createMock).not.toHaveBeenCalled();
      expect(generateAndSaveOtpMock).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email, update status to ACTIVE, and return access token', async () => {
      const mockUser = createMockUserEntity({
        id: 'user-id',
        email: 'user@example.com',
        status: UserStatus.PENDING_VERIFICATION,
      });
      const activeUser = createMockUserEntity({
        ...mockUser,
        status: UserStatus.ACTIVE,
      });

      findByEmailMock.mockResolvedValue(mockUser);
      updateMock.mockResolvedValue(activeUser);

      const result = await service.verifyEmail({
        email: 'user@example.com',
        otp: '123456',
      });

      expect(findByEmailMock).toHaveBeenCalledWith('user@example.com');
      expect(validateOtpMock).toHaveBeenCalledWith(
        'user@example.com',
        '123456',
        OtpType.EMAIL_VERIFICATION,
      );
      expect(updateMock).toHaveBeenCalledWith('user-id', {
        status: UserStatus.ACTIVE,
      });
      expect(signAsyncMock).toHaveBeenCalledWith({
        sub: activeUser.uid,
        email: activeUser.email,
        roles: activeUser.roles,
      });
      expect(result.user.status).toBe(UserStatus.ACTIVE);
      expect(result.accessToken).toBe('mock-jwt-token');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      findByEmailMock.mockResolvedValue(null);

      await expect(
        service.verifyEmail({ email: 'unknown@example.com', otp: '123456' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when email is already verified', async () => {
      findByEmailMock.mockResolvedValue(
        createMockUserEntity({ status: UserStatus.ACTIVE }),
      );

      await expect(
        service.verifyEmail({ email: 'active@example.com', otp: '123456' }),
      ).rejects.toThrow(new BadRequestException('Email is already verified'));
    });

    it('should throw ForbiddenException when user account is blocked', async () => {
      findByEmailMock.mockResolvedValue(
        createMockUserEntity({ status: UserStatus.BLOCKED }),
      );

      await expect(
        service.verifyEmail({ email: 'blocked@example.com', otp: '123456' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('resendOtp', () => {
    it('should generate new OTP and send email for pending user', async () => {
      const mockUser = createMockUserEntity({
        email: 'user@example.com',
        status: UserStatus.PENDING_VERIFICATION,
      });
      findByEmailMock.mockResolvedValue(mockUser);

      await service.resendOtp({ email: '  User@Example.com  ' });

      expect(findByEmailMock).toHaveBeenCalledWith('user@example.com');
      expect(generateAndSaveOtpMock).toHaveBeenCalledWith(
        'user@example.com',
        OtpType.EMAIL_VERIFICATION,
      );
      expect(sendOtpEmailMock).toHaveBeenCalledWith(
        'user@example.com',
        '123456',
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      findByEmailMock.mockResolvedValue(null);

      await expect(
        service.resendOtp({ email: 'unknown@example.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when email is already verified', async () => {
      findByEmailMock.mockResolvedValue(
        createMockUserEntity({ status: UserStatus.ACTIVE }),
      );

      await expect(
        service.resendOtp({ email: 'active@example.com' }),
      ).rejects.toThrow(new BadRequestException('Email is already verified'));
    });

    it('should throw ForbiddenException when user is blocked', async () => {
      findByEmailMock.mockResolvedValue(
        createMockUserEntity({ status: UserStatus.BLOCKED }),
      );

      await expect(
        service.resendOtp({ email: 'blocked@example.com' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
