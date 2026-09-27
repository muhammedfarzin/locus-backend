import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { UserRole } from 'src/identity/users/enums/user-role.enum';
import { UserStatus } from 'src/identity/users/enums/user-status.enum';

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
  });

  beforeEach(async () => {
    if (connection) {
      await connection
        .collection('users')
        .deleteMany({ email: new RegExp(`${testEmailDomain}$`, 'i') });
    }
  });

  afterAll(async () => {
    if (connection) {
      await connection
        .collection('users')
        .deleteMany({ email: new RegExp(`${testEmailDomain}$`, 'i') });
    }
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should successfully register a new user with default USER role and PENDING_VERIFICATION status', async () => {
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
      expect(body.data).toHaveProperty('accessToken');
      expect(typeof body.data.accessToken).toBe('string');
      expect(body.data.accessToken.split('.')).toHaveLength(3);

      expect(body.data.user).toBeDefined();
      expect(body.data.user.id).toBeUndefined();
      expect(body.data.user.uid).toMatch(/^usr_[A-Za-z0-9_-]+$/);
      expect(body.data.user.name).toBe('John Doe');
      expect(body.data.user.email).toBe(`john.doe${testEmailDomain}`);
      expect(body.data.user.roles).toEqual([UserRole.USER]);
      expect(body.data.user.status).toBe(UserStatus.PENDING_VERIFICATION);
      expect(body.data.user.password).toBeUndefined();
      expect(body.data.user.passwordHash).toBeUndefined();
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
});
