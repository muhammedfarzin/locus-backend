import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException } from '@nestjs/common';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { UserAuthProvider } from '../users/enums/user-auth-provider.enum';
import { UserEntity } from '../users/entities/user.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { RegisterDto } from './dto/register.dto';

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
  let signAsyncMock: jest.Mock<Promise<string>, [Record<string, unknown>]>;

  beforeEach(async () => {
    findByEmailMock = jest.fn<Promise<UserEntity | null>, [string]>();
    createMock = jest.fn<Promise<UserEntity>, [CreateUserDto]>();
    signAsyncMock = jest
      .fn<Promise<string>, [Record<string, unknown>]>()
      .mockResolvedValue('mock-jwt-token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: findByEmailMock,
            create: createMock,
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: signAsyncMock,
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
    it('should register a standard USER with default status ACTIVE', async () => {
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
      expect(result.message).toBe('Registration successful');
      expect(result.user.roles).toEqual([UserRole.USER]);
      expect(result.user.status).toBe(UserStatus.PENDING_VERIFICATION);
      expect(result.accessToken).toBe('mock-jwt-token');

      const [createArg] = createMock.mock.calls[0] as [{ password?: string }];
      expect(createArg.password).toBe('Password123!');
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
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          roles: [UserRole.USER],
          status: UserStatus.PENDING_VERIFICATION,
          identities: [],
        }),
      );
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
    });
  });
});
