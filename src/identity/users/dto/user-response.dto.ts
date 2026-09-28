import { OmitType } from '@nestjs/swagger';
import { UserEntity } from '../entities/user.entity';

export class UserResponseDto extends OmitType(UserEntity, [
  'id',
  'passwordHash',
] as const) {}
