import { Exclude, Expose } from 'class-transformer';
import { IsOptional } from 'class-validator';

@Exclude()
export class TermsSlotDto {
  @Expose()
  name: string;

  @Expose()
  label: string;

  @Expose()
  @IsOptional()
  link?: string;
}
