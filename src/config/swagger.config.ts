import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';
import { RegisterResponseDto } from '../identity/auth/dto/register-response.dto';
import { VerifyEmailResponseDto } from '../identity/auth/dto/verify-email-response.dto';
import { VerifyEmailDto } from '../identity/auth/dto/verify-email.dto';
import { ResendOtpDto } from '../identity/auth/dto/resend-otp.dto';

/**
 * Post-processes the OpenAPI document so that any standard response envelope
 * (@ApiStandardResponse and @ApiStandardErrorResponse) defaults its 'path' example
 * to the controller/method endpoint route path (e.g. '/auth/register'), unless explicitly overridden.
 */
export function patchSwaggerResponsePaths(
  document: OpenAPIObject,
): OpenAPIObject {
  if (!document.paths) return document;

  const httpMethods = [
    'get',
    'post',
    'put',
    'delete',
    'patch',
    'options',
    'head',
    'trace',
  ] as const;

  for (const [pathKey, pathItem] of Object.entries(document.paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    for (const method of httpMethods) {
      const operation = pathItem[method];
      if (!operation || !operation.responses) continue;

      for (const response of Object.values(
        operation.responses as Record<string, any>,
      )) {
        const schema =
          response?.content?.['application/json']?.schema ?? response?.schema;
        if (!schema || !Array.isArray(schema.allOf)) continue;

        const isStandardEnvelope = schema.allOf.some(
          (item: any) =>
            item?.$ref &&
            (item.$ref.endsWith('/ApiResponseDto') ||
              item.$ref.endsWith('/ApiErrorResponseDto')),
        );

        if (isStandardEnvelope) {
          let propsObj = schema.allOf.find(
            (item: any) => item && typeof item === 'object' && item.properties,
          );

          if (!propsObj) {
            propsObj = { properties: {} };
            schema.allOf.push(propsObj);
          }

          if (!propsObj.properties) {
            propsObj.properties = {};
          }

          if (!propsObj.properties.path) {
            propsObj.properties.path = {
              type: 'string',
              example: pathKey,
            };
          }
        }
      }
    }
  }

  return document;
}

export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Locus API')
    .setDescription('API documentation for the Locus backend platform')
    .setVersion('1.0')
    .addTag('Auth', 'Authentication and authorization endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      ApiResponseDto,
      ApiErrorResponseDto,
      RegisterResponseDto,
      VerifyEmailResponseDto,
      VerifyEmailDto,
      ResendOtpDto,
    ],
  });

  return patchSwaggerResponsePaths(document);
}

export function setupSwagger(app: INestApplication): void {
  const document = createSwaggerDocument(app);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Locus API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
