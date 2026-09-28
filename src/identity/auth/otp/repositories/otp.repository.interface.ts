import { OtpEntity } from '../entities/otp.entity';
import { OtpType } from '../enums/otp-type.enum';

export const OTP_REPOSITORY = Symbol('OTP_REPOSITORY');

export interface SaveOtpData {
  codeHash: string;
  expiresAt: Date;
  attempts?: number;
  resendCount?: number;
}

export interface IOtpRepository {
  createOrUpdate(
    identifier: string,
    type: OtpType,
    data: SaveOtpData,
  ): Promise<OtpEntity>;

  findByIdentifierAndType(
    identifier: string,
    type: OtpType,
  ): Promise<OtpEntity | null>;

  incrementAttempts(id: string): Promise<OtpEntity | null>;

  deleteByIdentifierAndType(
    identifier: string,
    type: OtpType,
  ): Promise<void>;
}
