import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { setupSwagger } from 'src/config/swagger.config';

describe('Swagger Documentation (e2e)', () => {
  let app: INestApplication;

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
    expect(res.status).toBe(200);
    expect(res.body.info.title).toBe('Locus API');
    expect(res.body.paths).toHaveProperty('/auth/register');
    expect(res.body.components.schemas).toHaveProperty('RegisterDto');
    expect(res.body.components.schemas).toHaveProperty('RegisterResponseDto');
  });
});
