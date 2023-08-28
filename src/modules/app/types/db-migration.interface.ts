export interface IDbMigration {
  up: (...args: any) => Promise<void>;
  down?: (...args: any) => Promise<void>;
}
