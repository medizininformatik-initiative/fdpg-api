import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { JwksProvider } from '../strategies/jwks.provider';

jest.mock('jwks-rsa', () => ({
  passportJwtSecret: jest.fn(),
}));
describe('JwksProvider', () => {
  let provider: JwksProvider;
  let configService = {
    get: jest.fn().mockReturnValue('MOCK'),
  };

  beforeEach(() => {
    provider = new JwksProvider(configService as unknown as ConfigService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should setup the jwksUri', () => {
    const expectedUri = 'MOCK/auth/realms/MOCK/protocol/openid-connect/certs';
    expect(provider.options.jwksUri).toEqual(expectedUri);
  });

  it('should hand over the provide method to passport', () => {
    provider.provide();
    expect(passportJwtSecret).toHaveBeenCalledTimes(1);
  });
});
