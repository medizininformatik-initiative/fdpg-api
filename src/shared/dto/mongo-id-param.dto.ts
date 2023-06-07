import { Expose } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { IsValidId } from '../validators/is-valid-id.validator';

export class MongoIdParamDto {
  @Expose()
  @IsValidId({ message: 'id must be a valid id' })
  id: string;
}

export class MongoTwoIdsParamDto {
  @Expose()
  @IsValidId({ message: 'mainId must be a valid id' })
  mainId: string;

  @Expose()
  @IsValidId({ message: 'subId must be a valid id' })
  subId: string;
}

export class MongoIdQueryDto {
  @Expose()
  @IsValidId({ message: 'id must be a valid id' })
  @IsOptional()
  id?: string;
}
