import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';
import { HydratedDocument } from 'mongoose';
import { UserAuthProvider } from '../enums/user-auth-provider.enum';
import { nanoid } from 'nanoid';
import { UserIdentity } from '../entities/user.entity';

@Schema({ timestamps: true })
export class User {
  @Prop({
    type: String,
    required: true,
    unique: true,
    default: () => `usr_${nanoid()}`,
  })
  uid: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({ type: String, required: false })
  passwordHash?: string;

  @Prop({
    type: [
      {
        provider: { type: String, enum: UserAuthProvider, required: true },
        providerId: { type: String, required: true },
      },
    ],
    default: [],
  })
  identities: UserIdentity[];

  @Prop({
    type: [String],
    enum: UserRole,
    required: true,
    default: [UserRole.USER],
  })
  roles: UserRole[];

  @Prop({
    type: String,
    required: true,
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status: UserStatus;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

export type UserDocument = HydratedDocument<User>;
