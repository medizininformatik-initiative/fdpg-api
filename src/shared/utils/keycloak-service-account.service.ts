import { Injectable, Logger } from '@nestjs/common';
import { IGetKeycloakUser } from 'src/modules/user/types/keycloak-user.interface';

/**
 * Service for fetching Keycloak service account information
 */
@Injectable()
export class KeycloakServiceAccountService {
  constructor() {}

  private readonly logger = new Logger(KeycloakServiceAccountService.name);

  /**
   * Decodes a JWT token and extracts the payload without verification.
   * Note: This is safe for extracting non-sensitive information from tokens already validated by Keycloak.
   *
   * @param token - The JWT access token
   * @returns The decoded token payload, or undefined if decoding fails
   */
  private decodeToken(token: string): IGetKeycloakUser | undefined {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        this.logger.warn('Invalid JWT token format');
        return undefined;
      }

      const payload = parts[1];
      const decoded = Buffer.from(payload, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      this.logger.error(`Failed to decode JWT token: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Extracts the email address from a service account access token.
   *
   * @param accessToken - The access token for the service account
   * @returns The email address of the service account, or undefined if not found
   */
  getServiceAccountEmail(accessToken: string): string | undefined {
    // Try to decode the token first to get email from claims
    const tokenPayload = this.decodeToken(accessToken);
    if (tokenPayload?.email) {
      this.logger.log(`Successfully extracted service account email from token: ${tokenPayload.email}`);
      return tokenPayload.email;
    }
  }
}
