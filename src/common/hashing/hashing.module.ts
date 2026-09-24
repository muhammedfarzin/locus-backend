import { Module } from '@nestjs/common';
import { BcryptService } from './bcrypt/bcrypt.service';
import { HASHING_SERVICE } from './hashing.service.interface';

@Module({
  providers: [
    BcryptService,
    {
      provide: HASHING_SERVICE,
      useExisting: BcryptService,
    },
  ],
  exports: [BcryptService, HASHING_SERVICE],
})
export class HashingModule {}
