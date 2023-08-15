import { Exclude, Expose } from 'class-transformer';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

@Exclude()
export class SetFdpgCheckNotesDto {
  @Expose()
  @IsNotEmptyString()
  value: string;
}
