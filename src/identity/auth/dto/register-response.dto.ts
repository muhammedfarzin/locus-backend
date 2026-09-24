import { UserEntity } from '../../users/entities/user.entity';

export class RegisterResponseDto {
  message: string;
  user: UserEntity;
  accessToken: string;
}
