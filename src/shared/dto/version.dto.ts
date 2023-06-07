import { Expose } from 'class-transformer';

export class VersionDto {
  @Expose()
  mayor: number;

  @Expose()
  minor: number;
}
