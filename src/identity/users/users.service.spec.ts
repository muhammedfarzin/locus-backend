/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import {
  USERS_REPOSITORY,
  type IUsersRepository,
} from './repositories/users.repository.interface';
import {
  HASHING_SERVICE,
  type IHashingService,
} from '../../common/hashing/hashing.service.interface';
import { UserEntity } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { UserStatus } from './enums/user-status.enum';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<IUsersRepository>;
  let hashingService: jest.Mocked<IHashingService>;

  const mockUserEntity = new UserEntity({
    id: 'mock-id',
    uid: 'mock-uid',
    name: 'Test User',
    email: 'test@example.com',
    roles: [UserRole.USER],
    status: UserStatus.ACTIVE,
    identities: [],
  });

  const mockPaginatedResult = {
    data: [mockUserEntity],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn().mockResolvedValue(mockUserEntity),
      findByEmail: jest.fn().mockResolvedValue(mockUserEntity),
      findByUid: jest.fn().mockResolvedValue(mockUserEntity),
      findById: jest.fn().mockResolvedValue(mockUserEntity),
      findAll: jest.fn().mockResolvedValue(mockPaginatedResult),
      update: jest.fn().mockResolvedValue(mockUserEntity),
      remove: jest.fn().mockResolvedValue(mockUserEntity),
    };

    hashingService = {
      hash: jest.fn().mockResolvedValue('mock-hashed-password'),
      compare: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: USERS_REPOSITORY,
          useValue: repository,
        },
        {
          provide: HASHING_SERVICE,
          useValue: hashingService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should hash password and call repository.create without plain password', async () => {
    const result = await service.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'PlainPassword123!',
    });

    expect(hashingService.hash).toHaveBeenCalledWith('PlainPassword123!');
    expect(repository.create).toHaveBeenCalledWith({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'mock-hashed-password',
    });
    expect(result).toEqual(mockUserEntity);
  });

  it('should call repository.create directly if no password is provided', async () => {
    const result = await service.create({
      name: 'Test User',
      email: 'test@example.com',
    });

    expect(hashingService.hash).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith({
      name: 'Test User',
      email: 'test@example.com',
    });
    expect(result).toEqual(mockUserEntity);
  });

  it('should call repository.findByEmail and return UserEntity', async () => {
    const result = await service.findByEmail('test@example.com');
    expect(repository.findByEmail).toHaveBeenCalledWith('test@example.com');
    expect(result).toEqual(mockUserEntity);
  });

  it('should call repository.findByUid and return UserEntity', async () => {
    const result = await service.findByUid('mock-uid');
    expect(repository.findByUid).toHaveBeenCalledWith('mock-uid');
    expect(result).toEqual(mockUserEntity);
  });

  it('should call repository.findById and return UserEntity', async () => {
    const result = await service.findById('mock-id');
    expect(repository.findById).toHaveBeenCalledWith('mock-id');
    expect(result).toEqual(mockUserEntity);
  });

  it('should call repository.findAll and return paginated result', async () => {
    const result = await service.findAll();
    expect(repository.findAll).toHaveBeenCalled();
    expect(result).toEqual(mockPaginatedResult);
  });

  it('should call repository.update and return updated UserEntity without hashing when password is not provided', async () => {
    const result = await service.update('mock-id', { name: 'Updated' });
    expect(hashingService.hash).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith('mock-id', {
      name: 'Updated',
    });
    expect(result).toEqual(mockUserEntity);
  });

  it('should hash password and call repository.update with passwordHash when password is provided in update', async () => {
    const result = await service.update('mock-id', {
      name: 'Updated Name',
      password: 'NewPassword123!',
    });
    expect(hashingService.hash).toHaveBeenCalledWith('NewPassword123!');
    expect(repository.update).toHaveBeenCalledWith('mock-id', {
      name: 'Updated Name',
      passwordHash: 'mock-hashed-password',
    });
    expect(result).toEqual(mockUserEntity);
  });

  it('should call repository.remove and return removed UserEntity', async () => {
    const result = await service.remove('mock-id');
    expect(repository.remove).toHaveBeenCalledWith('mock-id');
    expect(result).toEqual(mockUserEntity);
  });
});
