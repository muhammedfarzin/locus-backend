import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error category or type identifier',
    example: 'Bad Request',
  })
  error: string;

  @ApiProperty({
    description: 'Error message or validation failure details',
    example: 'Validation failed or request payload is invalid',
    oneOf: [
      { type: 'string', example: 'A user with this email already exists' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['Password must be at least 8 characters long'],
      },
    ],
  })
  message: string | string[];

  @ApiProperty({
    description: 'Payload data, always null for error responses',
    example: null,
    nullable: true,
    type: 'null',
    default: null,
  })
  data: null;

  @ApiProperty({
    description: 'Timestamp when the error occurred (ISO 8601 format)',
    example: '2026-09-26T00:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request URL path where error occurred',
    example: '/auth/register',
  })
  path: string;

  constructor(partial?: Partial<ApiErrorResponseDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
