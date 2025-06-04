import { ConfigService } from '@nestjs/config';
import { Role } from 'src/shared/enums/role.enum';

import { JwksProvider } from '../strategies/jwks.provider';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';

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
      let req = { headers: {} } as unknown as Request;
      req.headers['x-selected-role'] = Role.Researcher;
      const roles = [Role.Researcher];
      const payload = {
        realm_access: {
          roles,
        },
      };
      const result = await strategy.validate(req, payload);

      expect(result.roles).toEqual(roles);
    });

    it('should extract data sources', async () => {
      let req = { headers: {} } as unknown as Request;
      req.headers['x-selected-role'] = Role.DataSourceMember;
      const roles = [Role.DataSourceMember];
      const dataSources = [PlatformIdentifier.DIFE, PlatformIdentifier.Mii];
      const assignedDataSources = dataSources.join(';');

      const payload = {
        realm_access: {
          roles,
        },
        assignedDataSources,
      };

      const result = await strategy.validate(req, payload);
      expect(result.assignedDataSources).toEqual(dataSources);
    });

    it('should automatically set the data source for fdpg members', async () => {
      let req = { headers: {} } as unknown as Request;
      req.headers['x-selected-role'] = Role.FdpgMember;
      const roles = [Role.FdpgMember];
      const expectedDataSources = [PlatformIdentifier.Mii];
      const assignedDataSources = undefined;

      const payload = {
        realm_access: {
          roles,
        },
        assignedDataSources,
      };

      const result = await strategy.validate(req, payload);
      expect(result.assignedDataSources).toEqual(expectedDataSources);
    });

    test.each([Role.DizMember, Role.Researcher])('should detect if the role is from a location', async (role: Role) => {
      let req = { headers: {} } as unknown as Request;
      req.headers['x-selected-role'] = role;
      const payload = {
        realm_access: {
          roles: [role],
        },
      };
      const expected = role === Role.DizMember ? true : false;
      const result = await strategy.validate(req, payload);
      expect(result.isFromLocation).toEqual(expected);
    });

    test.each([MiiLocation.KUM, 'nope'])('should detect if the location is known', async (location: string) => {
      let req = { headers: {} } as unknown as Request;
      req.headers['x-selected-role'] = Role.Researcher;
      const payload = {
        MII_LOCATION: location,
      };
      const expected = location === MiiLocation.KUM ? true : false;
      const result = await strategy.validate(req, payload);
      expect(result.isKnownLocation).toEqual(expected);
    });
  });
});
