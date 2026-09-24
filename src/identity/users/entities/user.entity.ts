import { Exclude, Type } from 'class-transformer';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';
import { UserAuthProvider } from '../enums/user-auth-provider.enum';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from 'src/common/entities/base.entity';

export class UserIdentity {
  @ApiProperty({
    description: 'Authentication provider',
    enum: UserAuthProvider,
    example: UserAuthProvider.GOOGLE,
  })
  @IsEnum(UserAuthProvider)
  @IsNotEmpty()
  provider: UserAuthProvider;

  @ApiHideProperty()
  @Exclude()
  @IsString()
  @IsNotEmpty()
  providerId: string;

  constructor(partial?: Partial<UserIdentity>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class UserEntity extends BaseEntity {
  @ApiHideProperty()
  @Exclude()
  declare id: string;

  @ApiProperty({
    description: 'Unique public user identifier',
    example: 'usr_Abc123XyZ',
  })
  uid: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiHideProperty()
  @Exclude()
  passwordHash?: string;

  @ApiProperty({
    description: 'Linked authentication identities',
    type: () => [UserIdentity],
  })
  @Type(() => UserIdentity)
  identities: UserIdentity[];

  @ApiProperty({
    description: 'Roles assigned to the user',
    enum: UserRole,
    isArray: true,
    example: [UserRole.USER],
  })
  roles: UserRole[];

  @ApiProperty({
    description: 'Current status of the user account',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  status: UserStatus;

  constructor(partial?: Partial<UserEntity>) {
    super(partial);
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
