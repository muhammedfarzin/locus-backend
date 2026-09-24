import {
  IsString,
  IsEmail,
  IsArray,
  IsNotEmpty,
  MinLength,
  Matches,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';
import { UserIdentity } from '../entities/user.entity';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    description:
      'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    example: 'P@ssword123',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, {
    message: 'Password must be at least 8 characters long',
  })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  password?: string;

  @ApiPropertyOptional({
    description: 'List of authentication provider identities',
    type: () => [UserIdentity],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserIdentity)
  identities?: UserIdentity[] = [];

  @ApiPropertyOptional({
    description: 'Status of the user account',
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus = UserStatus.PENDING_VERIFICATION;

  @ApiPropertyOptional({
    description: 'Roles assigned to the user',
    enum: UserRole,
    isArray: true,
    default: [UserRole.USER],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[] = [UserRole.USER];
}
