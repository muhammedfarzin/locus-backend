import { ApiErrorResponseDto } from './api-error-response.dto';

describe('ApiErrorResponseDto', () => {
  it('should instantiate correctly with partial values', () => {
    const dto = new ApiErrorResponseDto({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation error',
      data: null,
      timestamp: '2026-09-26T00:00:00.000Z',
      path: '/auth/register',
    });

    expect(dto.statusCode).toBe(400);
    expect(dto.error).toBe('Bad Request');
    expect(dto.message).toBe('Validation error');
    expect(dto.data).toBeNull();
    expect(dto.timestamp).toBe('2026-09-26T00:00:00.000Z');
    expect(dto.path).toBe('/auth/register');
  });

  it('should support array of messages', () => {
    const dto = new ApiErrorResponseDto({
      statusCode: 400,
      error: 'Bad Request',
      message: ['Error 1', 'Error 2'],
      data: null,
      timestamp: '2026-09-26T00:00:00.000Z',
      path: '/auth/register',
    });

    expect(Array.isArray(dto.message)).toBe(true);
    expect(dto.message).toEqual(['Error 1', 'Error 2']);
  });

  it('should instantiate correctly without parameters', () => {
    const dto = new ApiErrorResponseDto();
    expect(dto).toBeDefined();
  });
});
