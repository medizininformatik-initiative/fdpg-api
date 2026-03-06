export interface IKeycloakRegistrationEvent {
  time: number;
  type: string;
  realmId: string;
  clientId: string;
  userId: string;
  sessionId: string;
  ipAddress: string;
  details?: {
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    redirect_uri?: string;
    [key: string]: string | undefined;
  };
}
