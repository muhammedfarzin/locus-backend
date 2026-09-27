import { ApiProperty, OmitType } from '@nestjs/swagger';
import { UserEntity } from '../../users/entities/user.entity';

export class RegisterResponseDto {
  @ApiProperty({
    description: 'The registered user details',
    type: () => OmitType(UserEntity, ['id', 'passwordHash'] as const),
  })
  user: UserEntity;

  @ApiProperty({
    description:
      'Signed JWT access token for authenticating subsequent requests',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfeHl6MTIzIiwiZW1haWwiOiJqb2huLmRvZUBleGFtcGxlLmNvbSIsInJvbGVzIjpbIlVTRVIiXSwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyNDI2MjJ9...',
  })
  accessToken: string;

  constructor(partial?: Partial<RegisterResponseDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
