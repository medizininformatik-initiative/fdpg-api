import { Exclude, Expose } from 'class-transformer';
import { IsBoolean } from 'class-validator';

@Exclude()
export class MarkAsDoneDto {
  @Expose()
  @IsBoolean()
  value: boolean;
}
