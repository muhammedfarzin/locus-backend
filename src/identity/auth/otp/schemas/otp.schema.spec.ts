import { OtpSchema } from './otp.schema';
import { OtpType } from '../enums/otp-type.enum';

describe('OtpSchema', () => {
  it('should have correct default type as EMAIL_VERIFICATION', () => {
    const typePath = OtpSchema.path('type') as {
      defaultValue?: unknown;
    };
    expect(typePath).toBeDefined();

    const defaultType =
      typeof typePath.defaultValue === 'function'
        ? (typePath.defaultValue as () => unknown)()
        : typePath.defaultValue;
    expect(defaultType).toBe(OtpType.EMAIL_VERIFICATION);
  });

  it('should have default attempts as 0', () => {
    const attemptsPath = OtpSchema.path('attempts') as {
      defaultValue?: unknown;
    };
    expect(attemptsPath).toBeDefined();

    const defaultAttempts =
      typeof attemptsPath.defaultValue === 'function'
        ? (attemptsPath.defaultValue as () => unknown)()
        : attemptsPath.defaultValue;
    expect(defaultAttempts).toBe(0);
  });

  it('should have default resendCount as 0', () => {
    const resendCountPath = OtpSchema.path('resendCount') as {
      defaultValue?: unknown;
    };
    expect(resendCountPath).toBeDefined();

    const defaultResendCount =
      typeof resendCountPath.defaultValue === 'function'
        ? (resendCountPath.defaultValue as () => unknown)()
        : resendCountPath.defaultValue;
    expect(defaultResendCount).toBe(0);
  });

  it('should define required paths correctly', () => {
    expect(OtpSchema.path('identifier')).toBeDefined();
    expect(OtpSchema.path('codeHash')).toBeDefined();
    expect(OtpSchema.path('expiresAt')).toBeDefined();
    expect(OtpSchema.path('resendCount')).toBeDefined();
  });
});
