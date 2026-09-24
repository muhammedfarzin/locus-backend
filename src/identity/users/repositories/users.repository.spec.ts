import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersRepository } from './users.repository';
import { User, UserDocument } from '../schemas/user.schema';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';
import { UserEntity } from '../entities/user.entity';

describe('UsersRepository', () => {
  let repository: UsersRepository;

  const mockUserDoc = {
    _id: { toString: () => 'mock-id' },
    uid: 'mock-uid',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hashed',
    roles: [UserRole.USER],
    status: UserStatus.ACTIVE,
    identities: [],
    toObject: () => ({
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  } as unknown as UserDocument;

  class MockUserModel {
    constructor(private readonly data: Partial<User>) {
      Object.assign(this, data);
    }

    save(): Promise<UserDocument> {
      return Promise.resolve(mockUserDoc);
    }

    static findQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([mockUserDoc]),
    };

    static find = jest.fn().mockImplementation(() => MockUserModel.findQuery);

    static countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });

    static findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUserDoc),
    });

    static findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUserDoc),
    });

    static findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUserDoc),
    });

    static findByIdAndDelete = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUserDoc),
    });
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        {
          provide: getModelToken(User.name),
          useValue: MockUserModel,
        },
      ],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should create and return UserEntity', async () => {
    const result = await repository.create({ email: 'test@example.com' });
    expect(result.id).toBe('mock-id');
    expect(result.email).toBe('test@example.com');
    expect(result).toBeInstanceOf(UserEntity);
  });

  it('should find by email and return UserEntity', async () => {
    const result = await repository.findByEmail('test@example.com');
    expect(result).not.toBeNull();
    expect(result).not.toBeUndefined();
    expect(result?.id).toBe('mock-id');
  });

  it('should find by uid and return UserEntity', async () => {
    const result = await repository.findByUid('mock-uid');
    expect(result).not.toBeNull();
    expect(result).not.toBeUndefined();
    expect(result?.uid).toBe('mock-uid');
  });

  it('should find by id and return UserEntity', async () => {
    const result = await repository.findById('mock-id');
    expect(result).not.toBeNull();
    expect(result).not.toBeUndefined();
    expect(result?.id).toBe('mock-id');
    expect(result).toBeInstanceOf(UserEntity);
  });

  it('should find all with default pagination and return paginated result', async () => {
    const results = await repository.findAll();
    expect(MockUserModel.find).toHaveBeenCalledWith({});
    expect(MockUserModel.findQuery.sort).toHaveBeenCalledWith({
      createdAt: -1,
    });
    expect(MockUserModel.findQuery.skip).toHaveBeenCalledWith(0);
    expect(MockUserModel.findQuery.limit).toHaveBeenCalledWith(10);
    expect(results.data).toHaveLength(1);
    expect(results.data[0].id).toBe('mock-id');
    expect(results.total).toBe(1);
    expect(results.page).toBe(1);
    expect(results.limit).toBe(10);
    expect(results.totalPages).toBe(1);
  });

  it('should find all with filtering, custom pagination, and search', async () => {
    const results = await repository.findAll({
      page: 2,
      limit: 5,
      roles: [UserRole.ADMIN, UserRole.USER],
      status: [UserStatus.ACTIVE],
      search: 'alice',
      sortBy: 'name',
      sortOrder: 'asc',
    });

    expect(MockUserModel.find).toHaveBeenCalledWith({
      roles: { $in: [UserRole.ADMIN, UserRole.USER] },
      status: { $in: [UserStatus.ACTIVE] },
      $or: [
        { name: { $regex: 'alice', $options: 'i' } },
        { email: { $regex: 'alice', $options: 'i' } },
      ],
    });
    expect(MockUserModel.findQuery.sort).toHaveBeenCalledWith({ name: 1 });
    expect(MockUserModel.findQuery.skip).toHaveBeenCalledWith(5);
    expect(MockUserModel.findQuery.limit).toHaveBeenCalledWith(5);
    expect(results.page).toBe(2);
    expect(results.limit).toBe(5);
  });

  it('should update and return UserEntity', async () => {
    const result = await repository.update('mock-id', { name: 'Updated' });
    expect(result).not.toBeNull();
    expect(result?.id).toBe('mock-id');
  });

  it('should remove and return UserEntity', async () => {
    const result = await repository.remove('mock-id');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('mock-id');
  });
});
