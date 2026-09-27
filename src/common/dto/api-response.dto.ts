import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T = unknown> {
  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Response message indicating the outcome of the operation',
    example: 'Request successful',
  })
  message: string;

  @ApiProperty({
    description: 'Payload data',
    required: false,
  })
  data: T;

  @ApiProperty({
    description: 'Timestamp when the response was generated (ISO 8601 format)',
    example: '2026-09-26T00:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request URL path',
    example: '/api/resource',
  })
  path: string;

  constructor(partial?: Partial<ApiResponseDto<T>>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
