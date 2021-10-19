import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwksProvider } from './jwks.provider';
import { UserDto } from 'src/auth-test/dto/user.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly jwksProvider: JwksProvider,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer: `${configService.get(
        'KEYCLOAK_HOST',
      )}/auth/realms/${configService.get('KEYCLOAK_REALM')}`,
      algorithms: ['RS256'],
      secretOrKeyProvider: jwksProvider.provide(),
    });
  }

  async validate(payload: any): Promise<UserDto> {
    return {
      userId: payload.sub,
      firstName: payload.given_name,
      lastName: payload.family_name,
      email: payload.email,
      roles: payload.realm_access?.roles ?? [],
    };
  }
}
