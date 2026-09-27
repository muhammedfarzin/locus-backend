import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { createSwaggerDocument, setupSwagger } from './swagger.config';

import {
  ApiStandardErrorResponse,
  ApiStandardResponse,
} from '../common/decorators/api-standard-response.decorator';

@Controller('test')
class TestController {
  @Get()
  findAll() {
    return [];
  }

  @Get('enveloped')
  @ApiStandardResponse()
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Bad request',
  })
  findEnveloped() {
    return [];
  }

  @Get('override-path')
  @ApiStandardResponse({
    path: '/explicit/path',
  })
  findOverridePath() {
    return [];
  }
}

describe('SwaggerConfig', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create an OpenAPI document with correct metadata and tags', () => {
    const document = createSwaggerDocument(app);

    expect(document).toBeDefined();
    expect(document.info.title).toBe('Locus API');
    expect(document.info.version).toBe('1.0');
    expect(document.info.description).toContain('Locus backend');

    const authTag = document.tags?.find((tag) => tag.name === 'Auth');
    expect(authTag).toBeDefined();

    expect(document.components?.securitySchemes).toHaveProperty('JWT-auth');
    expect(document.paths).toHaveProperty('/test');
    expect(document.paths).toHaveProperty('/test/enveloped');
  });

  it('should default response path example to the endpoint route path', () => {
    const document = createSwaggerDocument(app);
    const pathItem = document.paths['/test/enveloped'] as any;
    expect(pathItem).toBeDefined();

    // Check 200 response has path: '/test/enveloped'
    const successSchemaProps =
      pathItem.get.responses['200']?.content?.['application/json']?.schema
        ?.allOf?.[1]?.properties;
    expect(successSchemaProps?.path).toEqual({
      type: 'string',
      example: '/test/enveloped',
    });

    // Check 400 response has path: '/test/enveloped'
    const errorSchemaProps =
      pathItem.get.responses['400']?.content?.['application/json']?.schema
        ?.allOf?.[1]?.properties;
    expect(errorSchemaProps?.path).toEqual({
      type: 'string',
      example: '/test/enveloped',
    });
  });

  it('should preserve explicit path option when specified', () => {
    const document = createSwaggerDocument(app);
    const pathItem = document.paths['/test/override-path'] as any;
    expect(pathItem).toBeDefined();

    const schemaProps =
      pathItem.get.responses['200']?.content?.['application/json']?.schema
        ?.allOf?.[1]?.properties;
    expect(schemaProps?.path).toEqual({
      type: 'string',
      example: '/explicit/path',
    });
  });

  it('should call SwaggerModule.setup with api/docs', () => {
    const setupSpy = jest.spyOn(SwaggerModule, 'setup');

    setupSwagger(app);

    expect(setupSpy).toHaveBeenCalledWith(
      'api/docs',
      app,
      expect.any(Object),
      expect.objectContaining({
        customSiteTitle: 'Locus API Documentation',
      }),
    );

    setupSpy.mockRestore();
  });
});
