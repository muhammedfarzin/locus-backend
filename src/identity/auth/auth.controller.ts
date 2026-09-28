import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyEmailResponseDto } from './dto/verify-email-response.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
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
      'Creates a new user with standard credentials and sends a 6-digit OTP code to their email for verification.',
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

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Email verified successfully')
  @ApiOperation({
    summary: 'Verify email address with OTP',
    description:
      'Verifies the 6-digit OTP sent to the user email, activates the account, and returns an access token.',
  })
  @ApiStandardResponse({
    status: HttpStatus.OK,
    description: 'Email verified successfully',
    type: VerifyEmailResponseDto,
  })
  @ApiStandardErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired OTP, or email already verified',
    exampleError: 'Bad Request',
    exampleMessage: 'Invalid verification code',
  })
  @ApiStandardErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
    exampleError: 'Not Found',
    exampleMessage: 'User not found',
  })
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<VerifyEmailResponseDto> {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Verification OTP resent successfully')
  @ApiOperation({
    summary: 'Resend email verification OTP',
    description:
      'Generates and sends a new 6-digit OTP to the specified email address if the account is pending verification.',
  })
  @ApiStandardResponse({
    status: HttpStatus.OK,
    description: 'Verification OTP resent successfully',
  })
  @ApiStandardErrorResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Email is already verified',
    exampleError: 'Bad Request',
    exampleMessage: 'Email is already verified',
  })
  @ApiStandardErrorResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
    exampleError: 'Not Found',
    exampleMessage: 'User not found',
  })
  @ApiStandardErrorResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description:
      'Rate limit exceeded (cooldown active or maximum attempts reached)',
    exampleError: 'Too Many Requests',
    exampleMessage: 'Please wait before requesting another OTP',
  })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto): Promise<void> {
    return this.authService.resendOtp(resendOtpDto);
  }
}
