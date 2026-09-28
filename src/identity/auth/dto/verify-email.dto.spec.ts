import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VerifyEmailDto } from './verify-email.dto';

describe('VerifyEmailDto', () => {
  it('should validate with valid email and 6-digit OTP', async () => {
    const plain = {
      email: '  USER@Example.COM  ',
      otp: '123456',
    };

    const dto = plainToInstance(VerifyEmailDto, plain);
    expect(dto.email).toBe('user@example.com');
    expect(dto.otp).toBe('123456');

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when email is invalid', async () => {
    const plain = {
      email: 'invalid-email',
      otp: '123456',
    };

    const dto = plainToInstance(VerifyEmailDto, plain);
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
  });

  it('should fail when OTP is not 6 digits', async () => {
    const plainShort = {
      email: 'user@example.com',
      otp: '12345',
    };
    const dtoShort = plainToInstance(VerifyEmailDto, plainShort);
    const errorsShort = await validate(dtoShort);
    expect(errorsShort.length).toBeGreaterThan(0);
    expect(errorsShort[0].property).toBe('otp');

    const plainLong = {
      email: 'user@example.com',
      otp: '1234567',
    };
    const dtoLong = plainToInstance(VerifyEmailDto, plainLong);
    const errorsLong = await validate(dtoLong);
    expect(errorsLong.length).toBeGreaterThan(0);
    expect(errorsLong[0].property).toBe('otp');
  });

  it('should fail when OTP contains non-numeric characters', async () => {
    const plain = {
      email: 'user@example.com',
      otp: '12a456',
    };

    const dto = plainToInstance(VerifyEmailDto, plain);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('otp');
  });
});
