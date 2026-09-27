import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { setupSwagger } from 'src/config/swagger.config';

interface SwaggerSchema {
  properties: Record<string, unknown>;
}

interface SwaggerDoc {
  info: { title: string };
  paths: Record<string, unknown>;
  components: {
    schemas: Record<string, SwaggerSchema>;
  };
}

describe('Swagger Documentation (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should serve Swagger UI at /api/docs', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('should serve OpenAPI JSON specification at /api/docs-json', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs-json');
    const body = res.body as SwaggerDoc;

    expect(res.status).toBe(200);
    expect(body.info.title).toBe('Locus API');
    expect(body.paths).toHaveProperty('/auth/register');
    expect(body.components.schemas).toHaveProperty('RegisterDto');
    expect(body.components.schemas).toHaveProperty('RegisterResponseDto');
    expect(body.components.schemas).toHaveProperty('ApiResponseDto');
    expect(body.components.schemas).toHaveProperty('ApiErrorResponseDto');

    // Verify enveloped responses have path defaulted to the route path
    const registerPath = body.paths['/auth/register'] as any;
    expect(registerPath).toBeDefined();

    const res201 = registerPath.post?.responses?.['201'];
    expect(
      res201?.content?.['application/json']?.schema?.allOf?.[1]?.properties
        ?.path?.example,
    ).toBe('/auth/register');

    const res400 = registerPath.post?.responses?.['400'];
    expect(
      res400?.content?.['application/json']?.schema?.allOf?.[1]?.properties
        ?.path?.example,
    ).toBe('/auth/register');

    const res409 = registerPath.post?.responses?.['409'];
    expect(
      res409?.content?.['application/json']?.schema?.allOf?.[1]?.properties
        ?.path?.example,
    ).toBe('/auth/register');
  });
});
