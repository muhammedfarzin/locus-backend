import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { IHashingService } from '../hashing.service.interface';

@Injectable()
export class BcryptService implements IHashingService {
  private readonly saltRounds = 10;

  async hash(data: string): Promise<string> {
    return bcrypt.hash(data, this.saltRounds);
  }

  async compare(data: string, encrypted: string): Promise<boolean> {
    return bcrypt.compare(data, encrypted);
  }
}
