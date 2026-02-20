import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpressJwtOptions, passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class JwksProvider {
  private readonly logger = new Logger(JwksProvider.name);

  private handleSigningKeyError = (error: Error, cb) => {
    this.logger.error('Unable to verify jwt signing', error);
    cb(error);
  };

  options: ExpressJwtOptions = {
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: '',
    handleSigningKeyError: this.handleSigningKeyError,
  };

  constructor(protected readonly configService: ConfigService) {
    this.options.jwksUri = `${this.configService.get('KEYCLOAK_HOST')}/auth/realms/${this.configService.get(
      'KEYCLOAK_REALM',
    )}/protocol/openid-connect/certs`;
  }

  public provide = () => passportJwtSecret(this.options);
}
