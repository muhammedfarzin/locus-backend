import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, lastValueFrom } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';
import { RESPONSE_MESSAGE_METADATA } from '../decorators/response-message.decorator';
import { BYPASS_RESPONSE_TRANSFORM_METADATA } from '../decorators/bypass-response-transform.decorator';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;
  let reflector: jest.Mocked<Reflector>;

  const createMockContext = (
    options: {
      type?: string;
      statusCode?: number;
      url?: string;
      headersSent?: boolean;
    } = {},
  ): ExecutionContext => {
    const {
      type = 'http',
      statusCode = 200,
      url = '/api/v1/test',
      headersSent = false,
    } = options;

    const mockResponse = {
      statusCode,
      headersSent,
    };

    const mockRequest = {
      originalUrl: url,
      url,
    };

    return {
      getType: jest.fn().mockReturnValue(type),
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    interceptor = new ResponseInterceptor(reflector);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should wrap successful payload into standard response envelope', async () => {
    const context = createMockContext({ statusCode: 200, url: '/test' });
    const callHandler = { handle: () => of({ id: 123, name: 'Sample' }) };

    const result$ = interceptor.intercept(context, callHandler);
    const result = (await lastValueFrom(result$)) as Record<string, unknown>;

    expect(result.statusCode).toBe(200);
    expect(result.message).toBe('Request successful');
    expect(result.data).toEqual({ id: 123, name: 'Sample' });
    expect(result.path).toBe('/test');
    expect(typeof result.timestamp).toBe('string');
  });

  it('should use custom message from @ResponseMessage metadata', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === RESPONSE_MESSAGE_METADATA) return 'Custom item created';
    });

    const context = createMockContext({ statusCode: 201, url: '/items' });
    const callHandler = { handle: () => of({ id: 1 }) };

    const result$ = interceptor.intercept(context, callHandler);
    const result = (await lastValueFrom(result$)) as Record<string, unknown>;

    expect(result.statusCode).toBe(201);
    expect(result.message).toBe('Custom item created');
    expect(result.data).toEqual({ id: 1 });
  });

  it('should extract message and preserve extra data if returned object has data and other fields', async () => {
    const context = createMockContext({ statusCode: 200, url: '/items' });
    const callHandler = {
      handle: () =>
        of({
          message: 'Fetched list',
          data: [{ id: 1 }],
          meta: { total: 1, page: 1 },
        }),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = (await lastValueFrom(result$)) as Record<string, unknown>;

    expect(result.statusCode).toBe(200);
    expect(result.message).toBe('Fetched list');
    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.meta).toEqual({ total: 1, page: 1 });
  });

  it('should extract message and treat rest as data if returned object has message without data key', async () => {
    const context = createMockContext({ statusCode: 200, url: '/items' });
    const callHandler = {
      handle: () =>
        of({
          message: 'Operation finished',
          user: { name: 'Alice' },
          token: 'jwt-123',
        }),
    };

    const result$ = interceptor.intercept(context, callHandler);
    const result = (await lastValueFrom(result$)) as Record<string, unknown>;

    expect(result.statusCode).toBe(200);
    expect(result.message).toBe('Operation finished');
    expect(result.data).toEqual({
      user: { name: 'Alice' },
      token: 'jwt-123',
    });
  });

  it('should handle array payload properly as data', async () => {
    const context = createMockContext({ statusCode: 200, url: '/items' });
    const callHandler = { handle: () => of([1, 2, 3]) };

    const result$ = interceptor.intercept(context, callHandler);
    const result = (await lastValueFrom(result$)) as Record<string, unknown>;

    expect(result.data).toEqual([1, 2, 3]);
    expect(result.message).toBe('Request successful');
  });

  it('should set data to null when null or undefined is returned', async () => {
    const context = createMockContext({ statusCode: 200, url: '/items' });
    const callHandler = { handle: () => of(undefined) };

    const result$ = interceptor.intercept(context, callHandler);
    const result = (await lastValueFrom(result$)) as Record<string, unknown>;

    expect(result.data).toBeNull();
  });

  it('should bypass transformation when @BypassResponseTransform is applied', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === BYPASS_RESPONSE_TRANSFORM_METADATA) return true;
    });

    const context = createMockContext({ statusCode: 200 });
    const rawPayload = { raw: true };
    const callHandler = { handle: () => of(rawPayload) };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toBe(rawPayload);
  });

  it('should bypass transformation for non-http contexts', async () => {
    const context = createMockContext({ type: 'rpc' });
    const payload = { rpc: true };
    const callHandler = { handle: () => of(payload) };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toBe(payload);
  });

  it('should not wrap if headers are already sent', async () => {
    const context = createMockContext({ headersSent: true });
    const payload = 'raw-stream';
    const callHandler = { handle: () => of(payload) };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toBe(payload);
  });

  it('should not wrap for 204 NO_CONTENT responses', async () => {
    const context = createMockContext({ statusCode: HttpStatus.NO_CONTENT });
    const callHandler = { handle: () => of(null) };

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toBeNull();
  });
});
