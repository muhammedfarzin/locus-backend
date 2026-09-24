import { Exclude, Type } from 'class-transformer';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';
import { UserAuthProvider } from '../enums/user-auth-provider.enum';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { BaseEntity } from 'src/common/entities/base.entity';

export class UserIdentity {
  @IsEnum(UserAuthProvider)
  @IsNotEmpty()
  provider: UserAuthProvider;

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
  @Exclude()
  declare id: string;

  uid: string;
  name: string;
  email: string;

  @Exclude()
  passwordHash?: string;

  @Type(() => UserIdentity)
  identities: UserIdentity[];

  roles: UserRole[];
  status: UserStatus;

  constructor(partial?: Partial<UserEntity>) {
    super(partial);
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
