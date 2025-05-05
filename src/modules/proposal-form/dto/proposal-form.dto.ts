import { Expose, Type } from 'class-transformer';

export class ProposalFormDto {
  @Expose()
  formVersion: number;

  @Expose()
  @Type(() => Object)
  formSchema: object;
}
