import { BaseEntity } from 'src/common/entities/base.entity';
import { OtpType } from '../enums/otp-type.enum';
import { Exclude } from 'class-transformer';

export class OtpEntity extends BaseEntity {
  identifier: string;

  @Exclude()
  codeHash: string;

  type: OtpType;

  @Exclude()
  attempts: number;

  @Exclude()
  resendCount: number;

  @Exclude()
  expiresAt: Date;

  constructor(partial?: Partial<OtpEntity>) {
    super(partial);
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
