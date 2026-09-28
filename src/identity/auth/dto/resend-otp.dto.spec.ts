import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ResendOtpDto } from './resend-otp.dto';

describe('ResendOtpDto', () => {
  it('should validate with valid email', async () => {
    const plain = {
      email: '  USER@Example.COM  ',
    };

    const dto = plainToInstance(ResendOtpDto, plain);
    expect(dto.email).toBe('user@example.com');

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when email is invalid', async () => {
    const plain = {
      email: 'invalid-email',
    };

    const dto = plainToInstance(ResendOtpDto, plain);
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
  });

  it('should fail when email is empty', async () => {
    const plain = {
      email: ' ',
    };

    const dto = plainToInstance(ResendOtpDto, plain);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
  });
});
