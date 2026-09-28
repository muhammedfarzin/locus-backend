import { VerifyEmailResponseDto } from './verify-email-response.dto';
import { UserEntity } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';
import { UserStatus } from '../../users/enums/user-status.enum';

describe('VerifyEmailResponseDto', () => {
  it('should instantiate correctly with partial values', () => {
    const user = new UserEntity({
      id: 'mock-id',
      uid: 'usr_123',
      name: 'John Doe',
      email: 'john@example.com',
      roles: [UserRole.USER],
      status: UserStatus.ACTIVE,
    });

    const dto = new VerifyEmailResponseDto({
      user,
      accessToken: 'jwt-token-xyz',
    });

    expect(dto.user).toBe(user);
    expect(dto.accessToken).toBe('jwt-token-xyz');
  });

  it('should instantiate without parameters', () => {
    const dto = new VerifyEmailResponseDto();
    expect(dto).toBeDefined();
  });
});
