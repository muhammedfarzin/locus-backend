import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { UserEntity } from '../users/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Partial<AuthService>>;

  const mockUser = new UserEntity({
    id: 'mock-id',
    uid: 'mock-uid',
    name: 'Test User',
    email: 'test@example.com',
    roles: [UserRole.USER],
    status: UserStatus.PENDING_VERIFICATION,
  });

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue({
        user: mockUser,
      }),
      verifyEmail: jest.fn().mockResolvedValue({
        user: new UserEntity({ ...mockUser, status: UserStatus.ACTIVE }),
        accessToken: 'mock-jwt-token',
      }),
      resendOtp: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register and return the result', async () => {
      const registerDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      };

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result.user).toEqual(mockUser);
    });
  });

  describe('verifyEmail', () => {
    it('should call authService.verifyEmail and return the result', async () => {
      const verifyEmailDto = {
        email: 'test@example.com',
        otp: '123456',
      };

      const result = await controller.verifyEmail(verifyEmailDto);

      expect(authService.verifyEmail).toHaveBeenCalledWith(verifyEmailDto);
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe('resendOtp', () => {
    it('should call authService.resendOtp', async () => {
      const resendOtpDto = {
        email: 'test@example.com',
      };

      await controller.resendOtp(resendOtpDto);

      expect(authService.resendOtp).toHaveBeenCalledWith(resendOtpDto);
    });
  });
});
