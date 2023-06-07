import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class FeasibilityUserQueryDetailDto {
  @Expose()
  id: number;

  @Expose()
  label: string;

  @Expose()
  @Transform(({ value }) => new Date(value))
  createdAt: Date;
}
