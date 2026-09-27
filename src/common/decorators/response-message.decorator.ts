import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_METADATA = 'RESPONSE_MESSAGE_METADATA';
export const SWAGGER_API_RESPONSE_METADATA = 'swagger/apiResponse';

/**
 * Decorator to set a custom success message for a route response.
 * Also synchronizes the message example with Swagger's @ApiStandardResponse schema if applied.
 *
 * @param message The message to include in the standard response envelope.
 */
export const ResponseMessage = (message: string): MethodDecorator => {
  return <T>(
    target: object,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> | void => {
    SetMetadata(RESPONSE_MESSAGE_METADATA, message)(
      target,
      key as string | symbol,
      descriptor as TypedPropertyDescriptor<any>,
    );

    const targetObj = descriptor ? descriptor.value : target;
    if (!targetObj) {
      return descriptor;
    }

    // If ApiStandardResponse was already applied, update the Swagger response schema message example
    const responses = Reflect.getMetadata(
      SWAGGER_API_RESPONSE_METADATA,
      targetObj,
    ) as
      | Record<
          string,
          {
            schema?: {
              allOf?: Array<{ properties?: Record<string, unknown> }>;
            };
          }
        >
      | undefined;

    if (responses) {
      for (const statusKey of Object.keys(responses)) {
        const statusNum = Number(statusKey);
        // Only update successful responses (2xx), never error responses (4xx, 5xx)
        if (!isNaN(statusNum) && (statusNum < 200 || statusNum >= 300)) {
          continue;
        }

        const entry = responses[statusKey];
        if (entry?.schema?.allOf && Array.isArray(entry.schema.allOf)) {
          for (const item of entry.schema.allOf) {
            if (
              item?.properties &&
              ('statusCode' in item.properties || 'data' in item.properties)
            ) {
              item.properties.message = {
                type: 'string',
                example: message,
              };
            }
          }
        }
      }
    }

    return descriptor;
  };
};
