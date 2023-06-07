import { Expose } from 'class-transformer';
import { IsOptional, IsUUID } from 'class-validator';

export class UuidParamDto {
  @Expose()
  @IsUUID(4)
  id: string;
}

export class TwoUuidsParamDto {
  @Expose()
  @IsUUID(4)
  mainId: string;

  @Expose()
  @IsUUID(4)
  subId: string;
}

export class UuidQueryDto {
  @Expose()
  @IsUUID(4)
  @IsOptional()
  id?: string;
}
