import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { UserRole } from 'src/identity/users/enums/user-role.enum';
import { UserStatus } from 'src/identity/users/enums/user-status.enum';
import { MailService } from 'src/common/mail/mail.service';
import { OtpType } from 'src/identity/auth/otp/enums/otp-type.enum';

interface UserResponse {
  id?: string;
  uid: string;
  name: string;
  email: string;
  roles: UserRole[];
  status: UserStatus;
  password?: string;
  passwordHash?: string;
}

interface RegisterDataResponse {
  user: UserResponse;
}

interface VerifyEmailDataResponse {
  user: UserResponse;
  accessToken: string;
}

interface StandardTestResponse<T = unknown> {
  statusCode: number;
  message: string | string[];
  data: T;
  timestamp: string;
  path: string;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let connection: Connection;
  let mailService: MailService;
  let sendOtpEmailSpy: jest.SpyInstance;

  const testEmailDomain = '@e2e-test.com';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    connection = app.get<Connection>(getConnectionToken());
    mailService = app.get<MailService>(MailService);
    sendOtpEmailSpy = jest.spyOn(mailService, 'sendOtpEmail');
  });

  beforeEach(async () => {
    sendOtpEmailSpy.mockClear();
    if (connection) {
      await connection
        .collection('users')
        .deleteMany({ email: new RegExp(`${testEmailDomain}$`, 'i') });
      await connection
        .collection('otps')
        .deleteMany({ identifier: new RegExp(`${testEmailDomain}$`, 'i') });
    }
  });

  afterAll(async () => {
    if (connection) {
      await connection
        .collection('users')
        .deleteMany({ email: new RegExp(`${testEmailDomain}$`, 'i') });
      await connection
        .collection('otps')
        .deleteMany({ identifier: new RegExp(`${testEmailDomain}$`, 'i') });
    }
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should successfully register a new user with default USER role, PENDING_VERIFICATION status, and generate OTP email', async () => {
      const registerPayload = {
        name: 'John Doe',
        email: `john.doe${testEmailDomain}`,
        password: 'Password123!',
      };

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerPayload)
        .expect(201);

      const body = res.body as StandardTestResponse<RegisterDataResponse>;

      expect(body).toHaveProperty('statusCode', 201);
      expect(body).toHaveProperty('message', 'Registration successful');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('path', '/auth/register');
      expect(body).toHaveProperty('data');

      expect(body.data.user).toBeDefined();
      expect(body.data.user.id).toBeUndefined();
      expect(body.data.user.uid).toMatch(/^usr_[A-Za-z0-9_-]+$/);
      expect(body.data.user.name).toBe('John Doe');
      expect(body.data.user.email).toBe(`john.doe${testEmailDomain}`);
      expect(body.data.user.roles).toEqual([UserRole.USER]);
      expect(body.data.user.status).toBe(UserStatus.PENDING_VERIFICATION);
      expect(body.data.user.password).toBeUndefined();
      expect(body.data.user.passwordHash).toBeUndefined();

      // Verify OTP email was triggered
      expect(sendOtpEmailSpy).toHaveBeenCalledWith(
        `john.doe${testEmailDomain}`,
        expect.stringMatching(/^[0-9]{6}$/),
      );

      // Verify OTP stored in database
      const otpDoc = await connection.collection('otps').findOne({
        identifier: `john.doe${testEmailDomain}`,
        type: OtpType.EMAIL_VERIFICATION,
      });
      expect(otpDoc).toBeDefined();
    });

    it('should ignore client-supplied role and roles, assigning default USER role', async () => {
      const exploitedPayload = {
        name: 'Privileged Attacker',
        email: `attacker${testEmailDomain}`,
        password: 'Password123!',
        role: 'ADMIN',
        roles: ['ADMIN', 'DRIVER'],
      };

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(exploitedPayload)
        .expect(201);

      const body = res.body as StandardTestResponse<RegisterDataResponse>;

      expect(body.data.user.roles).toEqual([UserRole.USER]);
      expect(body.data.user.status).toBe(UserStatus.PENDING_VERIFICATION);
    });

    it('should reject duplicate registration with 409 Conflict', async () => {
      const registerPayload = {
        name: 'Jane Doe',
        email: `jane.doe${testEmailDomain}`,
        password: 'Password123!',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerPayload)
        .expect(201);

      const duplicateRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Jane Clone',
          email: `JANE.DOE${testEmailDomain}`,
          password: 'Password123!',
        })
        .expect(409);

      const duplicateBody = duplicateRes.body as StandardTestResponse<null>;

      expect(duplicateBody.statusCode).toBe(409);
      expect(duplicateBody.message).toBe(
        'A user with this email already exists',
      );
      expect(duplicateBody.data).toBeNull();
      expect(duplicateBody.path).toBe('/auth/register');
      expect(duplicateBody.timestamp).toBeDefined();
    });

    it('should reject registration when email format is invalid', async () => {
      const invalidPayload = {
        name: 'Bad Email',
        email: 'not-an-email',
        password: 'Password123!',
      };

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidPayload)
        .expect(400);

      const body = res.body as StandardTestResponse<null>;

      expect(body.statusCode).toBe(400);
      expect(body.data).toBeNull();
      expect(body.path).toBe('/auth/register');
      expect(body.timestamp).toBeDefined();
      expect(body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Invalid email address'),
        ]),
      );
    });

    it('should reject registration when password is weak', async () => {
      const weakPasswordPayload = {
        name: 'Weak Password',
        email: `weak${testEmailDomain}`,
        password: 'weak',
      };

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(weakPasswordPayload)
        .expect(400);

      const body = res.body as StandardTestResponse<null>;

      expect(body.statusCode).toBe(400);
      expect(body.data).toBeNull();
      expect(body.path).toBe('/auth/register');
      expect(body.timestamp).toBeDefined();
      expect(body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            'Password must be at least 8 characters long',
          ),
        ]),
      );
    });

    it('should reject registration when required fields are missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({})
        .expect(400);

      const body = res.body as StandardTestResponse<null>;

      expect(body.statusCode).toBe(400);
      expect(body.data).toBeNull();
      expect(body.path).toBe('/auth/register');
      expect(body.timestamp).toBeDefined();
      expect(body.message).toEqual(
        expect.arrayContaining([
          'Name is required',
          'Email is required',
          'Password is required',
        ]),
      );
    });
  });

  describe('POST /auth/verify-email', () => {
    it('should successfully verify email with valid OTP and return ACTIVE user and accessToken', async () => {
      const registerPayload = {
        name: 'Verify User',
        email: `verify.user${testEmailDomain}`,
        password: 'Password123!',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerPayload)
        .expect(201);

      const calls = sendOtpEmailSpy.mock.calls as [string, string][];
      const lastOtpCall = calls[calls.length - 1];
      const sentOtp = lastOtpCall[1];

      const verifyRes = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          email: `verify.user${testEmailDomain}`,
          otp: sentOtp,
        })
        .expect(200);

      const body =
        verifyRes.body as StandardTestResponse<VerifyEmailDataResponse>;

      expect(body.statusCode).toBe(200);
      expect(body.message).toBe('Email verified successfully');
      expect(body.data.user.status).toBe(UserStatus.ACTIVE);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.accessToken.split('.')).toHaveLength(3);

      // Verify OTP document was consumed/deleted
      const otpDoc = await connection.collection('otps').findOne({
        identifier: `verify.user${testEmailDomain}`,
      });
      expect(otpDoc).toBeNull();
    });

    it('should reject verification when OTP is invalid', async () => {
      const registerPayload = {
        name: 'Wrong Otp User',
        email: `wrong.otp${testEmailDomain}`,
        password: 'Password123!',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerPayload)
        .expect(201);

      const verifyRes = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          email: `wrong.otp${testEmailDomain}`,
          otp: '000000',
        })
        .expect(400);

      const body = verifyRes.body as StandardTestResponse<null>;
      expect(body.message).toBe('Invalid verification code');
    });

    it('should reject verification when user does not exist', async () => {
      const verifyRes = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          email: `nonexistent${testEmailDomain}`,
          otp: '123456',
        })
        .expect(404);

      const body = verifyRes.body as StandardTestResponse<null>;
      expect(body.message).toBe('User not found');
    });

    it('should reject verification when email is already verified', async () => {
      const registerPayload = {
        name: 'Already Active',
        email: `already.active${testEmailDomain}`,
        password: 'Password123!',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerPayload)
        .expect(201);

      const calls = sendOtpEmailSpy.mock.calls as [string, string][];
      const lastOtpCall = calls[calls.length - 1];
      const sentOtp = lastOtpCall[1];

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          email: `already.active${testEmailDomain}`,
          otp: sentOtp,
        })
        .expect(200);

      // Second verification attempt
      const secondRes = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          email: `already.active${testEmailDomain}`,
          otp: sentOtp,
        })
        .expect(400);

      const secondBody = secondRes.body as StandardTestResponse<null>;
      expect(secondBody.message).toBe('Email is already verified');
    });
  });

  describe('POST /auth/resend-otp', () => {
    it('should reject resend OTP when cooldown is active (429)', async () => {
      const registerPayload = {
        name: 'Cooldown User',
        email: `cooldown.user${testEmailDomain}`,
        password: 'Password123!',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerPayload)
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/auth/resend-otp')
        .send({
          email: `cooldown.user${testEmailDomain}`,
        })
        .expect(429);

      const body = res.body as StandardTestResponse<null>;
      expect(body.statusCode).toBe(429);
      expect(body.message).toContain(
        'before requesting a new verification code',
      );
    });

    it('should successfully resend OTP after cooldown has elapsed', async () => {
      const email = `resend.user${testEmailDomain}`;
      const registerPayload = {
        name: 'Resend User',
        email,
        password: 'Password123!',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerPayload)
        .expect(201);

      sendOtpEmailSpy.mockClear();

      // Fast-forward updatedAt past the 60s cooldown
      await connection
        .collection('otps')
        .updateOne(
          { identifier: email },
          { $set: { updatedAt: new Date(Date.now() - 65 * 1000) } },
        );

      const resendRes = await request(app.getHttpServer())
        .post('/auth/resend-otp')
        .send({ email })
        .expect(200);

      const body = resendRes.body as StandardTestResponse<null>;
      expect(body.statusCode).toBe(200);
      expect(body.message).toBe('Verification OTP resent successfully');
      expect(sendOtpEmailSpy).toHaveBeenCalledTimes(1);

      // Verify resendCount was incremented in DB
      const otpDoc = await connection
        .collection('otps')
        .findOne({ identifier: email });
      expect(otpDoc).toBeDefined();
      expect(otpDoc?.resendCount).toBe(1);
    });

    it('should reject and lockout user when maximum resend attempts are exceeded', async () => {
      const email = `maxresend.user${testEmailDomain}`;
      const registerPayload = {
        name: 'Max Resend User',
        email,
        password: 'Password123!',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerPayload)
        .expect(201);

      // Simulate reaching max resend count (3) past cooldown
      await connection.collection('otps').updateOne(
        { identifier: email },
        {
          $set: {
            resendCount: 3,
            updatedAt: new Date(Date.now() - 65 * 1000),
          },
        },
      );

      // The 4th resend attempt should trigger lockout
      const res = await request(app.getHttpServer())
        .post('/auth/resend-otp')
        .send({ email })
        .expect(429);

      const body = res.body as StandardTestResponse<null>;
      expect(body.statusCode).toBe(429);
      expect(body.message).toContain('Too many OTP requests. Please wait');

      // Subsequent attempt while locked out should also be rejected
      const lockoutRes = await request(app.getHttpServer())
        .post('/auth/resend-otp')
        .send({ email })
        .expect(429);

      const lockoutBody = lockoutRes.body as StandardTestResponse<null>;
      expect(lockoutBody.statusCode).toBe(429);
      expect(lockoutBody.message).toContain('Too many OTP requests');
    });

    it('should reject resend OTP when user is not found', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/resend-otp')
        .send({
          email: `ghost${testEmailDomain}`,
        })
        .expect(404);

      const body = res.body as StandardTestResponse<null>;
      expect(body.message).toBe('User not found');
    });

    it('should reject resend OTP when email is already verified', async () => {
      const registerPayload = {
        name: 'Active Resend',
        email: `active.resend${testEmailDomain}`,
        password: 'Password123!',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerPayload)
        .expect(201);

      const calls = sendOtpEmailSpy.mock.calls as [string, string][];
      const lastOtpCall = calls[calls.length - 1];
      const sentOtp = lastOtpCall[1];

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          email: `active.resend${testEmailDomain}`,
          otp: sentOtp,
        })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post('/auth/resend-otp')
        .send({
          email: `active.resend${testEmailDomain}`,
        })
        .expect(400);

      const body = res.body as StandardTestResponse<null>;
      expect(body.message).toBe('Email is already verified');
    });
  });
});
