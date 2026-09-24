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

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserIdentity)
  identities?: UserIdentity[] = [];

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus = UserStatus.PENDING_VERIFICATION;

  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[] = [UserRole.USER];
}
