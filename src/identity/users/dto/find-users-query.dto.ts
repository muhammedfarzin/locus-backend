import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

function toArray(value: unknown): unknown {
  if (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.flatMap((v) =>
      typeof v === 'string' ? v.split(',').map((s) => s.trim()) : v,
    );
  }
  if (typeof value === 'string') {
    return value.includes(',')
      ? value.split(',').map((v) => v.trim())
      : [value.trim()];
  }
  return [value];
}

export enum UserSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  NAME = 'name',
  EMAIL = 'email',
  STATUS = 'status',
}

export class FindUsersQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    minimum: 1,
    maximum: 50,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter users by matching name or email substring',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Filter users by roles (accepts array or comma-separated list)',
    enum: UserRole,
    isArray: true,
    example: [UserRole.USER],
  })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];

  @ApiPropertyOptional({
    description:
      'Filter users by status (accepts array or comma-separated list)',
    enum: UserStatus,
    isArray: true,
    example: [UserStatus.ACTIVE],
  })
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsEnum(UserStatus, { each: true })
  status?: UserStatus[];

  @ApiPropertyOptional({
    description: 'Field to sort users by',
    enum: UserSortBy,
    default: UserSortBy.CREATED_AT,
    example: UserSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(UserSortBy)
  sortBy?: UserSortBy | `${UserSortBy}` = UserSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Sorting order',
    enum: ['asc', 'desc'],
    default: 'desc',
    example: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export type FindAllOptions = FindUsersQueryDto;

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
