import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Otp, OtpDocument } from '../schemas/otp.schema';
import { OtpEntity } from '../entities/otp.entity';
import { OtpType } from '../enums/otp-type.enum';
import { IOtpRepository, SaveOtpData } from './otp.repository.interface';

@Injectable()
export class OtpRepository implements IOtpRepository {
  constructor(
    @InjectModel(Otp.name) private readonly otpModel: Model<Otp>,
  ) {}

  private toEntity(doc: OtpDocument | null): OtpEntity | null {
    if (!doc) {
      return null;
    }

    const docObj = doc.toObject();

    return new OtpEntity({
      id: (doc._id || doc.id).toString(),
      identifier: doc.identifier,
      codeHash: doc.codeHash,
      type: doc.type,
      attempts: doc.attempts ?? 0,
      resendCount: doc.resendCount ?? 0,
      expiresAt: doc.expiresAt,
      createdAt: docObj.createdAt,
      updatedAt: docObj.updatedAt,
    });
  }

  async createOrUpdate(
    identifier: string,
    type: OtpType,
    data: SaveOtpData,
  ): Promise<OtpEntity> {
    const normalizedIdentifier = identifier.toLowerCase().trim();
    const doc = (await this.otpModel
      .findOneAndUpdate(
        { identifier: normalizedIdentifier, type },
        {
          identifier: normalizedIdentifier,
          type,
          codeHash: data.codeHash,
          attempts: data.attempts ?? 0,
          resendCount: data.resendCount ?? 0,
          expiresAt: data.expiresAt,
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      )
      .exec()) as OtpDocument;

    return this.toEntity(doc)!;
  }

  async findByIdentifierAndType(
    identifier: string,
    type: OtpType,
  ): Promise<OtpEntity | null> {
    const doc = (await this.otpModel
      .findOne({ identifier: identifier.toLowerCase().trim(), type })
      .exec()) as OtpDocument | null;

    return this.toEntity(doc);
  }

  async incrementAttempts(id: string): Promise<OtpEntity | null> {
    const doc = (await this.otpModel
      .findByIdAndUpdate(
        id,
        { $inc: { attempts: 1 } },
        { returnDocument: 'after' },
      )
      .exec()) as OtpDocument | null;

    return this.toEntity(doc);
  }

  async deleteByIdentifierAndType(
    identifier: string,
    type: OtpType,
  ): Promise<void> {
    await this.otpModel
      .deleteOne({ identifier: identifier.toLowerCase().trim(), type })
      .exec();
  }
}
