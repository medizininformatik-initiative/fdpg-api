export interface ITokenResult {
  access_token: string;
  /** Lifetime in seconds */
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
  'not-before-policy': number;
  scope: string;
}
