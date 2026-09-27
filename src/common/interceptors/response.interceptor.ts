import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { RESPONSE_MESSAGE_METADATA } from '../decorators/response-message.decorator';
import { BYPASS_RESPONSE_TRANSFORM_METADATA } from '../decorators/bypass-response-transform.decorator';
import { StandardResponse } from '../interfaces/response.interface';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  StandardResponse<T> | T
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<StandardResponse<T> | T> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const isBypassed = this.reflector.getAllAndOverride<boolean>(
      BYPASS_RESPONSE_TRANSFORM_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (isBypassed) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<Request>();

    const metadataMessage = this.reflector.getAllAndOverride<string>(
      RESPONSE_MESSAGE_METADATA,
      [context.getHandler(), context.getClass()],
    );

    return next.handle().pipe(
      map((resData: T): StandardResponse<T> | T => {
        if (response.headersSent) {
          return resData;
        }

        const statusCode = response.statusCode || HttpStatus.OK;

        if (statusCode === Number(HttpStatus.NO_CONTENT)) {
          return resData;
        }

        let message = metadataMessage || 'Request successful';
        let data: unknown = resData;
        let extra: Record<string, unknown> = {};

        if (
          resData !== null &&
          typeof resData === 'object' &&
          !Array.isArray(resData)
        ) {
          const resObj = resData as Record<string, unknown>;

          if (typeof resObj.message === 'string') {
            message = resObj.message;
          }

          if ('data' in resObj) {
            data = resObj.data;
            const rest = { ...resObj };
            delete rest.message;
            delete rest.data;
            extra = rest;
          } else if ('message' in resObj) {
            const rest = { ...resObj };
            delete rest.message;
            data = rest;
          }
        }

        const path: string = request.originalUrl || request.url || '';

        const standardResponse: StandardResponse<T> = {
          statusCode,
          message,
          data: (data !== undefined ? data : null) as T,
          timestamp: new Date().toISOString(),
          path,
          ...extra,
        };

        return standardResponse;
      }),
    );
  }
}
