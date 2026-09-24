import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { createSwaggerDocument, setupSwagger } from './swagger.config';

@Controller('test')
class TestController {
  @Get()
  findAll() {
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
