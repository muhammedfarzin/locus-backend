import 'reflect-metadata';
import { instanceToPlain } from 'class-transformer';
import { UserEntity, UserIdentity } from './user.entity';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';
import { UserAuthProvider } from '../enums/user-auth-provider.enum';
import { BaseEntity } from 'src/common/entities/base.entity';

interface SerializedIdentity {
  provider: UserAuthProvider;
  providerId?: string;
}

interface SerializedUser {
  id?: string;
  uid: string;
  name: string;
  email: string;
  passwordHash?: string;
  identities: SerializedIdentity[];
  roles: UserRole[];
  status: UserStatus;
}

describe('UserEntity serialization', () => {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const updatedAt = new Date('2026-01-02T00:00:00.000Z');

  const createTestUser = () => {
    return new UserEntity({
      id: 'mongo-id-12345',
      uid: 'user-uid-abcde',
      name: 'John Doe',
      email: 'john.doe@example.com',
      passwordHash: '$2a$10$hashedpasswordstring',
      roles: [UserRole.USER],
      status: UserStatus.ACTIVE,
      createdAt,
      updatedAt,
      identities: [
        new UserIdentity({
          provider: UserAuthProvider.GOOGLE,
          providerId: 'google-oauth-id-98765',
        }),
      ],
    });
  };

  it('should exclude id, passwordHash, and identities.providerId when using instanceToPlain', () => {
    const user = createTestUser();
    const plain = instanceToPlain(user) as unknown as SerializedUser;

    // Sensitive fields must be excluded
    expect(plain.id).toBeUndefined();
    expect(plain.passwordHash).toBeUndefined();
    expect(plain).not.toHaveProperty('id');
    expect(plain).not.toHaveProperty('passwordHash');

    expect(plain.identities).toBeDefined();
    expect(plain.identities).toHaveLength(1);
    expect(plain.identities[0].providerId).toBeUndefined();
    expect(plain.identities[0]).not.toHaveProperty('providerId');
    expect(plain.identities[0].provider).toBe(UserAuthProvider.GOOGLE);

    // Non-sensitive fields must be included
    expect(plain.uid).toBe('user-uid-abcde');
    expect(plain.name).toBe('John Doe');
    expect(plain.email).toBe('john.doe@example.com');
    expect(plain.roles).toEqual([UserRole.USER]);
    expect(plain.status).toBe(UserStatus.ACTIVE);
  });

  it('should exclude id, passwordHash, and identities.providerId when using JSON.stringify', () => {
    const user = createTestUser();
    const jsonString = JSON.stringify(user);
    const parsed = JSON.parse(jsonString) as SerializedUser;

    // Sensitive fields must not be present in serialized JSON
    expect(parsed.id).toBeUndefined();
    expect(parsed.passwordHash).toBeUndefined();
    expect(parsed).not.toHaveProperty('id');
    expect(parsed).not.toHaveProperty('passwordHash');

    expect(parsed.identities).toBeDefined();
    expect(parsed.identities).toHaveLength(1);
    expect(parsed.identities[0].providerId).toBeUndefined();
    expect(parsed.identities[0]).not.toHaveProperty('providerId');
    expect(parsed.identities[0].provider).toBe(UserAuthProvider.GOOGLE);

    // Non-sensitive fields must remain
    expect(parsed.uid).toBe('user-uid-abcde');
    expect(parsed.name).toBe('John Doe');
    expect(parsed.email).toBe('john.doe@example.com');
    expect(parsed.roles).toEqual([UserRole.USER]);
    expect(parsed.status).toBe(UserStatus.ACTIVE);
  });

  it('should exclude providerId even when identities are provided as plain objects', () => {
    const user = new UserEntity({
      id: 'mongo-id-12345',
      uid: 'user-uid-abcde',
      name: 'John Doe',
      email: 'john.doe@example.com',
      passwordHash: '$2a$10$hashedpasswordstring',
      roles: [UserRole.USER],
      status: UserStatus.ACTIVE,
      identities: [
        {
          provider: UserAuthProvider.GOOGLE,
          providerId: 'plain-provider-id',
        },
      ],
    });

    const plain = instanceToPlain(user) as unknown as SerializedUser;
    expect(plain.id).toBeUndefined();
    expect(plain.passwordHash).toBeUndefined();
    expect(plain.identities[0].providerId).toBeUndefined();
    expect(plain.identities[0].provider).toBe(UserAuthProvider.GOOGLE);

    const json = JSON.parse(JSON.stringify(user)) as SerializedUser;
    expect(json.id).toBeUndefined();
    expect(json.passwordHash).toBeUndefined();
    expect(json.identities[0].providerId).toBeUndefined();
    expect(json.identities[0].provider).toBe(UserAuthProvider.GOOGLE);
  });

  it('should be an instance of BaseEntity and inherit toJSON', () => {
    const user = createTestUser();
    expect(user).toBeInstanceOf(BaseEntity);
    expect(user.createdAt).toBe(createdAt);
    expect(user.updatedAt).toBe(updatedAt);

    const plain = user.toJSON();
    expect(plain.id).toBeUndefined();
    expect(plain.uid).toBe('user-uid-abcde');
    expect(plain.createdAt).toEqual(createdAt);
    expect(plain.updatedAt).toEqual(updatedAt);
  });
});
