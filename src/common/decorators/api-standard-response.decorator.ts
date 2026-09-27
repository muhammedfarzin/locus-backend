import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiResponse,
  getSchemaPath,
  SchemaObject,
} from '@nestjs/swagger';
import { ApiResponseDto } from '../dto/api-response.dto';
import { ApiErrorResponseDto } from '../dto/api-error-response.dto';
import { RESPONSE_MESSAGE_METADATA } from './response-message.decorator';

export interface ApiStandardResponseOptions<
  TModel extends Type<unknown> = Type<unknown>,
> {
  type?: TModel | [TModel];
  status?: number;
  description?: string;
  isArray?: boolean;
  message?: string;
  path?: string;
}

/**
 * Swagger decorator to document a standard enveloped successful response.
 * Uses the message example from ResponseMessage decorator or options.message.
 */
export function ApiStandardResponse<TModel extends Type<unknown>>(
  options: ApiStandardResponseOptions<TModel> = {},
): MethodDecorator & ClassDecorator {
  const status = options.status ?? HttpStatus.OK;
  const description = options.description ?? 'Request successful';

  return <T>(
    target: object,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<T>,
  ): void => {
    let decorator: MethodDecorator & ClassDecorator;
    const targetObj = descriptor ? descriptor.value : target;

    const responseMessage =
      options.message ??
      (targetObj
        ? (Reflect.getMetadata(RESPONSE_MESSAGE_METADATA, targetObj) as
            string | undefined)
        : undefined);

    const customProperties: Record<string, SchemaObject> = {};
    if (responseMessage) {
      customProperties.message = { type: 'string', example: responseMessage };
    }
    if (options.path) {
      customProperties.path = { type: 'string', example: options.path };
    }

    if (!options.type) {
      decorator = applyDecorators(
        ApiExtraModels(ApiResponseDto),
        ApiResponse({
          status,
          description,
          schema: {
            allOf: [
              { $ref: getSchemaPath(ApiResponseDto) },
              {
                properties: {
                  statusCode: { type: 'number', example: status },
                  data: { type: 'object', nullable: true, default: null },
                  ...customProperties,
                },
              },
            ],
          },
        }),
      );
    } else {
      const isArray = Array.isArray(options.type) || options.isArray;
      const targetType = Array.isArray(options.type)
        ? options.type[0]
        : options.type;

      decorator = applyDecorators(
        ApiExtraModels(ApiResponseDto, targetType),
        ApiResponse({
          status,
          description,
          schema: {
            allOf: [
              { $ref: getSchemaPath(ApiResponseDto) },
              {
                properties: {
                  statusCode: { type: 'number', example: status },
                  data: isArray
                    ? {
                        type: 'array',
                        items: { $ref: getSchemaPath(targetType) },
                      }
                    : { $ref: getSchemaPath(targetType) },
                  ...customProperties,
                },
              },
            ],
          },
        }),
      );
    }

    decorator(
      target,
      propertyKey as string,
      descriptor as TypedPropertyDescriptor<any>,
    );
  };
}

export interface ApiStandardErrorResponseOptions {
  status: number;
  description: string;
  exampleMessage?: string | string[];
  exampleError?: string;
  path?: string;
}

/**
 * Swagger decorator to document a standard enveloped error response.
 */
export function ApiStandardErrorResponse(
  options: ApiStandardErrorResponseOptions,
) {
  const customProperties: Record<string, SchemaObject> = {};
  if (options.exampleError) {
    customProperties.error = {
      type: 'string',
      example: options.exampleError,
    };
  }
  if (options.exampleMessage) {
    customProperties.message = Array.isArray(options.exampleMessage)
      ? {
          type: 'array',
          items: { type: 'string' },
          example: options.exampleMessage,
        }
      : { type: 'string', example: options.exampleMessage };
  }
  if (options.path) {
    customProperties.path = { type: 'string', example: options.path };
  }

  return applyDecorators(
    ApiExtraModels(ApiErrorResponseDto),
    ApiResponse({
      status: options.status,
      description: options.description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiErrorResponseDto) },
          {
            properties: {
              statusCode: { type: 'number', example: options.status },
              ...customProperties,
            },
          },
        ],
      },
    }),
  );
}
