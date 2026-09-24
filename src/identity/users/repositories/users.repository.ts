import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { UserEntity, UserIdentity } from '../entities/user.entity';
import { UpdateUserDto } from '../dto/update-user.dto';
import type {
  FindUsersQueryDto,
  PaginatedResult,
} from '../dto/find-users-query.dto';
import type { IUsersRepository } from './users.repository.interface';

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  private toEntity(doc: UserDocument | null): UserEntity | null {
    if (!doc) {
      return null;
    }

    const docObj = doc.toObject();

    const identities = (docObj.identities ?? []).map(
      (identity: any) =>
        new UserIdentity({
          provider: identity.provider,
          providerId: identity.providerId,
        }),
    );

    return new UserEntity({
      id: (doc._id || doc.id).toString(),
      uid: doc.uid,
      name: doc.name,
      email: doc.email,
      passwordHash: doc.passwordHash,
      identities,
      roles: [...doc.roles],
      status: doc.status,
      createdAt: docObj.createdAt,
      updatedAt: docObj.updatedAt,
    });
  }

  async create(userData: Partial<UserEntity>): Promise<UserEntity> {
    const createdUser = new this.userModel(userData);
    const savedDoc = await createdUser.save();
    return this.toEntity(savedDoc)!;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const doc = await this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .exec();
    return this.toEntity(doc);
  }

  async findById(id: string): Promise<UserEntity | null> {
    const doc = await this.userModel.findById(id).exec();
    return this.toEntity(doc);
  }

  async findByUid(uid: string): Promise<UserEntity | null> {
    const doc = await this.userModel.findOne({ uid }).exec();
    return this.toEntity(doc);
  }

  async findAll(
    query: FindUsersQueryDto = {},
  ): Promise<PaginatedResult<UserEntity>> {
    const {
      page = 1,
      limit = 10,
      search,
      roles,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: Record<string, any> = {};

    if (roles && roles.length > 0) {
      filter.roles = { $in: roles };
    }

    if (status && status.length > 0) {
      filter.status = { $in: status };
    }

    if (search && search.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [docs, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    const data = docs
      .map((doc) => this.toEntity(doc))
      .filter((entity): entity is UserEntity => entity !== null);

    return {
      data,
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserEntity | null> {
    const doc = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
    return this.toEntity(doc);
  }

  async remove(id: string): Promise<UserEntity | null> {
    const doc = await this.userModel.findByIdAndDelete(id).exec();
    return this.toEntity(doc);
  }
}
