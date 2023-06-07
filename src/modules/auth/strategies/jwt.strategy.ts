import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ALL_LOCATIONS, INACTIVE_LOCATIONS } from 'src/shared/constants/mii-locations';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { getSingleKnownRole } from 'src/shared/utils/get-single-known-role.util';
import { JwksProvider } from './jwks.provider';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(protected readonly configService: ConfigService, protected readonly jwksProvider: JwksProvider) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer: `${configService.get('KEYCLOAK_HOST')}/auth/realms/${configService.get('KEYCLOAK_REALM')}`,
      algorithms: ['RS256'],
      secretOrKeyProvider: jwksProvider.provide(),
    });
  }

  async validate(payload: any): Promise<IRequestUser> {
    // Validation is performed in jwt-auth.guard.ts
    const roles = payload.realm_access?.roles ?? [];
    const singleKnownRole = getSingleKnownRole(roles);
    const isFromLocation = singleKnownRole === Role.DizMember || singleKnownRole === Role.UacMember;
    const isKnownLocation = ALL_LOCATIONS.includes(payload.MII_LOCATION);
    const isInactiveLocation = INACTIVE_LOCATIONS.includes(payload.MII_LOCATION);

    return {
      userId: payload.sub,
      firstName: payload.given_name,
      lastName: payload.family_name,
      fullName: payload.name,
      email: payload.email,
      username: payload.preferred_username,
      roles,
      singleKnownRole,
      email_verified: payload.email_verified,
      miiLocation: payload.MII_LOCATION,
      isFromLocation,
      isKnownLocation,
      isInactiveLocation,
    };
  }
}
