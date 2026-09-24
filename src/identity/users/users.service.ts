import { Inject, Injectable } from '@nestjs/common';
import { UserEntity } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  USERS_REPOSITORY,
  type IUsersRepository,
} from './repositories/users.repository.interface';
import {
  HASHING_SERVICE,
  type IHashingService,
} from '../../common/hashing/hashing.service.interface';
import type {
  FindUsersQueryDto,
  PaginatedResult,
} from './dto/find-users-query.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    @Inject(HASHING_SERVICE)
    private readonly hashingService: IHashingService,
  ) {}

  async create(userData: CreateUserDto): Promise<UserEntity> {
    const passwordHash = userData.password
      ? await this.hashingService.hash(userData.password)
      : undefined;

    const userPayload: Partial<UserEntity> = {
      name: userData.name,
      email: userData.email,
      roles: userData.roles,
      status: userData.status,
      identities: userData.identities,
      passwordHash,
    };

    return this.usersRepository.create(userPayload);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findByUid(uid: string): Promise<UserEntity | null> {
    return this.usersRepository.findByUid(uid);
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findById(id);
  }

  async findAll(
    query?: FindUsersQueryDto,
  ): Promise<PaginatedResult<UserEntity>> {
    return this.usersRepository.findAll(query);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserEntity | null> {
    const updatePayload: UpdateUserDto = { ...updateUserDto };

    if (updateUserDto.password) {
      updatePayload.passwordHash = await this.hashingService.hash(
        updateUserDto.password,
      );
      delete updatePayload.password;
    }

    return this.usersRepository.update(id, updatePayload);
  }

  async remove(id: string): Promise<UserEntity | null> {
    return this.usersRepository.remove(id);
  }
}
