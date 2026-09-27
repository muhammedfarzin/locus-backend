import { ApiResponseDto } from './api-response.dto';

describe('ApiResponseDto', () => {
  it('should instantiate correctly with partial values', () => {
    const dto = new ApiResponseDto({
      statusCode: 200,
      message: 'Operation succeeded',
      data: { id: 1 },
      timestamp: '2026-09-26T00:00:00.000Z',
      path: '/api/test',
    });

    expect(dto.statusCode).toBe(200);
    expect(dto.message).toBe('Operation succeeded');
    expect(dto.data).toEqual({ id: 1 });
    expect(dto.timestamp).toBe('2026-09-26T00:00:00.000Z');
    expect(dto.path).toBe('/api/test');
  });

  it('should instantiate correctly without parameters', () => {
    const dto = new ApiResponseDto();
    expect(dto).toBeDefined();
  });
});
