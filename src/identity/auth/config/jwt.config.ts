import { ConfigModule, ConfigService, registerAs } from '@nestjs/config';
import { JwtModuleAsyncOptions, JwtModuleOptions } from '@nestjs/jwt';

export const jwtEnvConfig = registerAs('jwt', () => ({
  secret:
    process.env.JWT_SECRET || 'locus-default-secret-key-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '1d',
}));

export const getJwtConfig = (
  configService: ConfigService,
): JwtModuleOptions => ({
  secret:
    configService.get<string>('JWT_SECRET') ||
    configService.get<string>('jwt.secret') ||
    'locus-default-secret-key-change-in-production',
  signOptions: {
    expiresIn:
      configService.get('JWT_EXPIRES_IN') ||
      configService.get('jwt.expiresIn') ||
      '1d',
  },
});

export const jwtAsyncConfig: JwtModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: getJwtConfig,
};

export const jwtConfig = jwtAsyncConfig;
