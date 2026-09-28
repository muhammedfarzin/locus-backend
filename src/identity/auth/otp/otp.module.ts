import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OTP_REPOSITORY } from './repositories/otp.repository.interface';
import { OtpRepository } from './repositories/otp.repository';
import { Otp, OtpSchema } from './schemas/otp.schema';
import { OtpService } from './otp.service';
import { HashingModule } from 'src/common/hashing/hashing.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Otp.name, schema: OtpSchema }]),
    HashingModule,
  ],
  providers: [
    OtpRepository,
    {
      provide: OTP_REPOSITORY,
      useExisting: OtpRepository,
    },
    OtpService,
  ],
  exports: [OtpService, OTP_REPOSITORY],
})
export class OtpModule {}
