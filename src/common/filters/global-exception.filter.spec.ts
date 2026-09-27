import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
    headersSent: boolean;
  };
  let mockRequest: {
    originalUrl: string;
    url: string;
  };
  let mockHost: ArgumentsHost;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});

    filter = new GlobalExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false,
    };

    mockRequest = {
      originalUrl: '/api/test',
      url: '/api/test',
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should format HttpException with string response correctly', () => {
    const exception = new HttpException(
      'Forbidden resource',
      HttpStatus.FORBIDDEN,
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Forbidden resource',
        error: 'Http',
        data: null,
        path: '/api/test',
      }),
    );
  });

  it('should format HttpException with object response (e.g. ValidationPipe array) correctly', () => {
    const exception = new BadRequestException({
      statusCode: 400,
      message: ['Name is required', 'Email is invalid'],
      error: 'Bad Request',
    });

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: ['Name is required', 'Email is invalid'],
        error: 'Bad Request',
        data: null,
        path: '/api/test',
      }),
    );
  });

  it('should format ConflictException correctly', () => {
    const exception = new ConflictException(
      'A user with this email already exists',
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        message: 'A user with this email already exists',
        error: 'Conflict',
        data: null,
        path: '/api/test',
      }),
    );
  });

  it('should format unhandled generic Error as 500 Internal Server Error', () => {
    const exception = new Error('Database connection crashed');

    filter.catch(exception, mockHost);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Unhandled exception: Database connection crashed',
      exception.stack,
    );
    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database connection crashed',
        error: 'Internal Server Error',
        data: null,
        path: '/api/test',
      }),
    );
  });

  it('should format unknown non-Error thrown value as 500', () => {
    filter.catch('Unexpected string error', mockHost);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Unknown exception thrown',
      'Unexpected string error',
    );
    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        data: null,
      }),
    );
  });

  it('should do nothing if response headers have already been sent', () => {
    mockResponse.headersSent = true;
    const exception = new BadRequestException('Bad request');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });
});
