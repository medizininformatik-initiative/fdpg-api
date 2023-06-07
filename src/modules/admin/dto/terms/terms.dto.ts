import { Exclude, Expose, Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { TermsSlotDto } from './terms-slot.dto';

@Exclude()
export class TermsDto {
  @Expose()
  label: string;

  @Expose()
  @ValidateNested()
  @Type(() => TermsSlotDto)
  slots: TermsSlotDto[];
}
