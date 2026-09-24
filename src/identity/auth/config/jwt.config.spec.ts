import { ConfigService } from '@nestjs/config';
import {
  getJwtConfig,
  jwtAsyncConfig,
  jwtConfig,
  jwtEnvConfig,
} from './jwt.config';

describe('JwtConfig', () => {
  let configService: ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getJwtConfig', () => {
    it('should return default values when config is not set', () => {
      configService = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      const result = getJwtConfig(configService);

      expect(result).toEqual({
        secret: 'locus-default-secret-key-change-in-production',
        signOptions: {
          expiresIn: '1d',
        },
      });
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
      expect(configService.get).toHaveBeenCalledWith('jwt.secret');
      expect(configService.get).toHaveBeenCalledWith('JWT_EXPIRES_IN');
      expect(configService.get).toHaveBeenCalledWith('jwt.expiresIn');
    });

    it('should use JWT_SECRET and JWT_EXPIRES_IN when defined', () => {
      configService = {
        get: jest.fn((key: string) => {
          if (key === 'JWT_SECRET') return 'custom-jwt-secret';
          if (key === 'JWT_EXPIRES_IN') return '7d';
          return undefined;
        }),
      } as unknown as ConfigService;

      const result = getJwtConfig(configService);

      expect(result).toEqual({
        secret: 'custom-jwt-secret',
        signOptions: {
          expiresIn: '7d',
        },
      });
    });

    it('should use jwt.secret and jwt.expiresIn when namespaced config is present', () => {
      configService = {
        get: jest.fn((key: string) => {
          if (key === 'jwt.secret') return 'namespaced-jwt-secret';
          if (key === 'jwt.expiresIn') return '12h';
          return undefined;
        }),
      } as unknown as ConfigService;

      const result = getJwtConfig(configService);

      expect(result).toEqual({
        secret: 'namespaced-jwt-secret',
        signOptions: {
          expiresIn: '12h',
        },
      });
    });
  });

  describe('jwtConfig and jwtAsyncConfig', () => {
    it('should define module async options properly', () => {
      expect(jwtConfig).toBe(jwtAsyncConfig);
      expect(jwtConfig.inject).toEqual([ConfigService]);
      expect(typeof jwtConfig.useFactory).toBe('function');

      const mockConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      if (jwtConfig.useFactory) {
        const factoryResult = jwtConfig.useFactory(mockConfigService);
        expect(factoryResult).toEqual({
          secret: 'locus-default-secret-key-change-in-production',
          signOptions: {
            expiresIn: '1d',
          },
        });
      }
    });
  });

  describe('jwtEnvConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return env configuration defaults', () => {
      delete process.env.JWT_SECRET;
      delete process.env.JWT_EXPIRES_IN;

      const config = jwtEnvConfig();
      expect(config).toEqual({
        secret: 'locus-default-secret-key-change-in-production',
        expiresIn: '1d',
      });
    });

    it('should return process.env values when provided', () => {
      process.env.JWT_SECRET = 'env-secret';
      process.env.JWT_EXPIRES_IN = '2h';

      const config = jwtEnvConfig();
      expect(config).toEqual({
        secret: 'env-secret',
        expiresIn: '2h',
      });
    });
  });
});
