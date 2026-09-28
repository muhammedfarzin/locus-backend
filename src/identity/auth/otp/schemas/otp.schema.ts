import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OtpType } from '../enums/otp-type.enum';

@Schema({ timestamps: true })
export class Otp {
  /**
   * Target recipient/destination for the OTP (e.g., email address, mobile number).
   */
  @Prop({
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  identifier: string;

  @Prop({
    type: String,
    required: true,
  })
  codeHash: string;

  @Prop({
    type: String,
    enum: OtpType,
    required: true,
    default: OtpType.EMAIL_VERIFICATION,
  })
  type: OtpType;

  @Prop({
    type: Number,
    required: true,
    default: 0,
  })
  attempts: number;

  @Prop({
    type: Number,
    required: true,
    default: 0,
  })
  resendCount: number;

  @Prop({
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 },
  })
  expiresAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

OtpSchema.index({ identifier: 1, type: 1 }, { unique: true });

export type OtpDocument = HydratedDocument<Otp>;
