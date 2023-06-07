import { ConfigService } from '@nestjs/config';
import { Role } from 'src/shared/enums/role.enum';

import { JwksProvider } from '../strategies/jwks.provider';
import { JwtStrategy } from '../strategies/jwt.strategy';
import * as getSingleKnownRoleModule from 'src/shared/utils/get-single-known-role.util';
import { MiiLocation } from 'src/shared/constants/mii-locations';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const configService = {
    get: jest.fn().mockReturnValue('MOCK'),
  };

  let jwksProvider = {
    provide: jest.fn().mockReturnValue('MOCK'),
  };

  beforeEach(() => {
    strategy = new JwtStrategy(configService as unknown as ConfigService, jwksProvider as unknown as JwksProvider);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should extract the roles', async () => {
      const roles = [Role.Researcher];
      const payload = {
        realm_access: {
          roles,
        },
      };
      const result = await strategy.validate(payload);

      expect(result.roles).toEqual(roles);
    });

    it('should set the getSingleKnownRole', async () => {
      jest.spyOn(getSingleKnownRoleModule, 'getSingleKnownRole').mockReturnValueOnce(Role.Researcher);
      const roles = [Role.Researcher, Role.DizMember];
      const payload = {
        realm_access: {
          roles,
        },
      };
      const result = await strategy.validate(payload);
      expect(result.singleKnownRole).toEqual(Role.Researcher);
    });

    test.each([Role.DizMember, Role.Researcher])('should detect if the role is from a location', async (role: Role) => {
      const payload = {
        realm_access: {
          roles: [role],
        },
      };
      const expected = role === Role.DizMember ? true : false;
      const result = await strategy.validate(payload);
      expect(result.isFromLocation).toEqual(expected);
    });

    test.each([MiiLocation.KUM, 'nope'])('should detect if the location is known', async (location: string) => {
      const payload = {
        MII_LOCATION: location,
      };
      const expected = location === MiiLocation.KUM ? true : false;
      const result = await strategy.validate(payload);
      expect(result.isKnownLocation).toEqual(expected);
    });
  });
});
