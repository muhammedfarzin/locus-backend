import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FindUsersQueryDto } from './find-users-query.dto';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

describe('FindUsersQueryDto', () => {
  it('should transform comma-separated strings to array of roles and status', async () => {
    const plain = {
      roles: `${UserRole.ADMIN},${UserRole.USER}`,
      status: `${UserStatus.ACTIVE},${UserStatus.PENDING_VERIFICATION}`,
    };

    const dto = plainToInstance(FindUsersQueryDto, plain);
    expect(dto.roles).toEqual([UserRole.ADMIN, UserRole.USER]);
    expect(dto.status).toEqual([
      UserStatus.ACTIVE,
      UserStatus.PENDING_VERIFICATION,
    ]);

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should keep arrays intact and valid', async () => {
    const plain = {
      roles: [UserRole.ADMIN],
      status: [UserStatus.BLOCKED],
    };

    const dto = plainToInstance(FindUsersQueryDto, plain);
    expect(dto.roles).toEqual([UserRole.ADMIN]);
    expect(dto.status).toEqual([UserStatus.BLOCKED]);

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should transform single string to array', async () => {
    const plain = {
      roles: UserRole.DRIVER,
      status: UserStatus.ACTIVE,
    };

    const dto = plainToInstance(FindUsersQueryDto, plain);
    expect(dto.roles).toEqual([UserRole.DRIVER]);
    expect(dto.status).toEqual([UserStatus.ACTIVE]);

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when invalid role or status enum is passed', async () => {
    const plain = {
      roles: ['INVALID_ROLE'],
      status: ['INVALID_STATUS'],
    };

    const dto = plainToInstance(FindUsersQueryDto, plain);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept valid sortBy values', async () => {
    const plain = { sortBy: 'name' };
    const dto = plainToInstance(FindUsersQueryDto, plain);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.sortBy).toBe('name');
  });

  it('should reject invalid sortBy value such as "somethingelse"', async () => {
    const plain = { sortBy: 'somethingelse' };
    const dto = plainToInstance(FindUsersQueryDto, plain);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const sortByError = errors.find((e) => e.property === 'sortBy');
    expect(sortByError).toBeDefined();
    expect(sortByError?.constraints?.isEnum).toBeDefined();
  });
});
