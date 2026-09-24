import { User, UserSchema } from './user.schema';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

describe('UserSchema', () => {
  it('should generate a default uid with usr_ prefix using nanoid', () => {
    const uidPath = UserSchema.path('uid');
    expect(uidPath).toBeDefined();

    const generatedUid =
      typeof uidPath.defaultValue === 'function' ? uidPath.defaultValue() : '';
    expect(generatedUid).toMatch(/^usr_[A-Za-z0-9_-]+$/);
  });

  it('should have default roles as [UserRole.USER]', () => {
    const rolesPath = UserSchema.path('roles');
    expect(rolesPath).toBeDefined();

    const defaultRoles =
      typeof rolesPath.defaultValue === 'function'
        ? rolesPath.defaultValue()
        : rolesPath.defaultValue;
    expect(defaultRoles).toEqual([UserRole.USER]);
  });

  it('should have default status as PENDING_VERIFICATION', () => {
    const statusPath = UserSchema.path('status');
    expect(statusPath).toBeDefined();

    const defaultStatus =
      typeof statusPath.defaultValue === 'function'
        ? statusPath.defaultValue()
        : statusPath.defaultValue;
    expect(defaultStatus).toBe(UserStatus.PENDING_VERIFICATION);
  });
});
