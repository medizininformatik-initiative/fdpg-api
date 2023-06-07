export interface IKeycloakActionsEmail {
  client_id: string;
  redirect_uri: string;
  /** Number of seconds after which the generated token expires */
  lifespan: number;
}
