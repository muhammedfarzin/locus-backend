import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import {
  ApiStandardErrorResponse,
  ApiStandardResponse,
} from 'src/common/decorators/api-standard-response.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Registration successful')
  @ApiOperation({
    summary: 'Register a new user account',
    description:
      'Creates a new user with standard credentials and returns an access token along with sanitized user details.',
  })
  @ApiStandardResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
    type: RegisterResponseDto,
  })
  @ApiStandardErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed or request payload is invalid',
    exampleError: 'Bad Request',
    exampleMessage: [
      'Password must be at least 8 characters long',
      'Email must be a valid email address',
    ],
  })
  @ApiStandardErrorResponse({
    status: HttpStatus.CONFLICT,
    description: 'A user with this email already exists',
    exampleError: 'Conflict',
    exampleMessage: 'A user with this email already exists',
  })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<RegisterResponseDto> {
    return this.authService.register(registerDto);
  }
}
