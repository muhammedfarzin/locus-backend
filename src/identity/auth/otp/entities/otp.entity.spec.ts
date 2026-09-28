import 'reflect-metadata';
import { OtpEntity } from './otp.entity';
import { OtpType } from '../enums/otp-type.enum';

describe('OtpEntity', () => {
  it('should instantiate correctly with partial values', () => {
    const expiresAt = new Date('2026-09-27T21:00:00.000Z');
    const createdAt = new Date('2026-09-27T20:50:00.000Z');
    const updatedAt = new Date('2026-09-27T20:55:00.000Z');

    const entity = new OtpEntity({
      id: 'mock-id-123',
      identifier: 'user@example.com',
      codeHash: 'hashed-secret',
      type: OtpType.EMAIL_VERIFICATION,
      attempts: 2,
      resendCount: 3,
      expiresAt,
      createdAt,
      updatedAt,
    });

    expect(entity.id).toBe('mock-id-123');
    expect(entity.identifier).toBe('user@example.com');
    expect(entity.codeHash).toBe('hashed-secret');
    expect(entity.type).toBe(OtpType.EMAIL_VERIFICATION);
    expect(entity.attempts).toBe(2);
    expect(entity.resendCount).toBe(3);
    expect(entity.expiresAt).toEqual(expiresAt);
    expect(entity.createdAt).toEqual(createdAt);
    expect(entity.updatedAt).toEqual(updatedAt);
  });

  it('should instantiate empty when no parameters are provided', () => {
    const entity = new OtpEntity();
    expect(entity).toBeDefined();
    expect(entity.id).toBeUndefined();
  });
});
