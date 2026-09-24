import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const normalizedEmail = registerDto.email.trim().toLowerCase();
    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const createdUser = await this.usersService.create({
      name: registerDto.name.trim(),
      email: normalizedEmail,
      password: registerDto.password,
      roles: [UserRole.USER],
      status: UserStatus.PENDING_VERIFICATION,
      identities: [],
    });

    const payload = {
      sub: createdUser.uid,
      email: createdUser.email,
      roles: createdUser.roles,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      message: 'Registration successful',
      user: createdUser,
      accessToken,
    };
  }
}
