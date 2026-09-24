import { UserEntity } from '../entities/user.entity';
import { UpdateUserDto } from '../dto/update-user.dto';
import {
  FindUsersQueryDto,
  PaginatedResult,
} from '../dto/find-users-query.dto';

export const USERS_REPOSITORY = 'IUsersRepository';

export interface IUsersRepository {
  create(userData: Partial<UserEntity>): Promise<UserEntity>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  findByUid(uid: string): Promise<UserEntity | null>;
  findAll(query?: FindUsersQueryDto): Promise<PaginatedResult<UserEntity>>;
  update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity | null>;
  remove(id: string): Promise<UserEntity | null>;
}
