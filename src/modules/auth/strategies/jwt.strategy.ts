import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ALL_LOCATIONS, INACTIVE_LOCATIONS } from 'src/shared/constants/mii-locations';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { JwksProvider } from './jwks.provider';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly jwksProvider: JwksProvider,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer: `${configService.get('KEYCLOAK_HOST')}/auth/realms/${configService.get('KEYCLOAK_REALM')}`,
      algorithms: ['RS256'],
      secretOrKeyProvider: jwksProvider.provide(),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any): Promise<IRequestUser> {
    // Validation is performed in jwt-auth.guard.ts

    const roles = payload.realm_access?.roles ?? [];
    const singleKnownRole = roles.find((role) => role === req.headers['x-selected-role']);
    const isFromLocation = singleKnownRole === Role.DizMember || singleKnownRole === Role.UacMember;
    const isKnownLocation = ALL_LOCATIONS.includes(payload.MII_LOCATION);
    const isInactiveLocation = INACTIVE_LOCATIONS.includes(payload.MII_LOCATION);

    const assignedDataSources: PlatformIdentifier[] = (payload.assignedDataSources?.split(';') ?? [])
      .map((raw) => raw.trim()) // strip whitespace
      .filter(Boolean) // drop empty tokens
      .map((token) => token.toUpperCase()) // normalize
      .map((upper) => {
        // find matching key…
        const key = (Object.keys(PlatformIdentifier) as Array<keyof typeof PlatformIdentifier>).find(
          (k) => k.toUpperCase() === upper,
        );
        return key ? PlatformIdentifier[key] : undefined; // …and map to the enum value
      })
      .filter((val): val is PlatformIdentifier => Boolean(val)); // drop non-matches

    if (singleKnownRole === Role.FdpgMember && !assignedDataSources.includes(PlatformIdentifier.Mii)) {
      assignedDataSources.push(PlatformIdentifier.Mii);
    }

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
      assignedDataSources,
    };
  }
}
