import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Partial<AuthService>>;

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue({
        message: 'Registration successful',
        user: {
          id: 'mock-id',
          uid: 'mock-uid',
          name: 'Test User',
          email: 'test@example.com',
          roles: [UserRole.USER],
          status: UserStatus.ACTIVE,
        },
        accessToken: 'mock-jwt-token',
      }),
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

  it('should call authService.register and return the result', async () => {
    const registerDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
    };

    const result = await controller.register(registerDto);

    expect(authService.register).toHaveBeenCalledWith(registerDto);
    expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
    expect(result.user.roles).toEqual([UserRole.USER]);
  });
});
