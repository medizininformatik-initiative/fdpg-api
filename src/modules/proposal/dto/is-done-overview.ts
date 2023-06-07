import { Exclude, Expose, Type } from 'class-transformer';
import { ExposeId } from 'src/shared/decorators/transform/expose-id.decorator';

@Exclude()
export class IsDoneDetailGetDto {
  @Expose()
  path: string;

  @Expose()
  value: boolean;

  @ExposeId()
  _id: string;
}

@Exclude()
export class IsDoneOverviewGetDto {
  @Expose()
  fieldCount: number;

  @Expose()
  isDoneCount: number;

  @Expose()
  @Type(() => IsDoneDetailGetDto)
  fields: IsDoneDetailGetDto[];
}
