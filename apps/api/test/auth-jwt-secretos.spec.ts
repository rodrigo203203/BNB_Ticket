import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validateEnvironment } from '../src/config/env.config';
import { obtenerJwtAccessSecret } from '../src/config/secretos-entorno.util';

describe('JwtModule y secretos resueltos', () => {
  it('firma y verifica sin JWT_ACCESS_SECRET en process.env (dev usa default)', async () => {
    const prevJwt = process.env.JWT_ACCESS_SECRET;
    const prevEnv = process.env.NODE_ENV;
    delete process.env.JWT_ACCESS_SECRET;
    process.env.NODE_ENV = 'development';

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          validate: validateEnvironment,
        }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            secret: obtenerJwtAccessSecret(config),
            signOptions: { expiresIn: '15m' },
          }),
        }),
      ],
    }).compile();

    const jwt = module.get(JwtService);
    const config = module.get(ConfigService);
    expect(config.get<string>('JWT_ACCESS_SECRET')).toBeTruthy();
    expect(config.get<string>('jwtAccessSecret')).toBe(config.get<string>('JWT_ACCESS_SECRET'));
    const secret = obtenerJwtAccessSecret(config);
    const token = await jwt.signAsync({ sub: 'u1' }, { secret });
    const payload = await jwt.verifyAsync(token, { secret });
    expect(payload.sub).toBe('u1');

    if (prevJwt === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = prevJwt;
    if (prevEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevEnv;
  });
});