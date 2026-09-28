import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../../users/entities/user.entity';
import { UserResponseDto } from 'src/identity/users/dto/user-response.dto';

export class VerifyEmailResponseDto {
  @ApiProperty({
    description: 'The verified user details',
    type: () => UserResponseDto,
  })
  user: UserEntity;

  @ApiProperty({
    description:
      'Signed JWT access token for authenticating subsequent requests',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfeHl6MTIzIiwiZW1haWwiOiJqb2huLmRvZUBleGFtcGxlLmNvbSIsInJvbGVzIjpbIlVTRVIiXSwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyNDI2MjJ9...',
  })
  accessToken: string;

  constructor(partial?: Partial<VerifyEmailResponseDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
