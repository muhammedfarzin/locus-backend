import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from 'src/identity/users/dto/user-response.dto';

export class RegisterResponseDto {
  @ApiProperty({
    description: 'The registered user details',
    type: () => UserResponseDto,
  })
  user: UserResponseDto;

  constructor(partial?: Partial<RegisterResponseDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
