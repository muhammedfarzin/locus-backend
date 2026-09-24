import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../../users/entities/user.entity';

export class RegisterResponseDto {
  @ApiProperty({
    description: 'Status message indicating the outcome of the operation',
    example: 'Registration successful',
  })
  message: string;

  @ApiProperty({
    description: 'The registered user details',
    type: () => UserEntity,
  })
  user: UserEntity;

  @ApiProperty({
    description:
      'Signed JWT access token for authenticating subsequent requests',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfeHl6MTIzIiwiZW1haWwiOiJqb2huLmRvZUBleGFtcGxlLmNvbSIsInJvbGVzIjpbIlVTRVIiXSwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyNDI2MjJ9...',
  })
  accessToken: string;
}
