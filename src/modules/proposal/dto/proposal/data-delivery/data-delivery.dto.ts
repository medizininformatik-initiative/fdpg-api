import { Expose, Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { DeliveryAcceptance } from '../../../enums/data-delivery.enum';
import { DeliveryInfoGetDto, DeliveryInfoUpdateDto } from './delivery-info.dto';

export class DataDeliveryUpdateDto {
  @Expose()
  @IsString()
  dataManagementSite: string;

  @Expose()
  @IsEnum(DeliveryAcceptance)
  acceptance: DeliveryAcceptance;

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryInfoUpdateDto)
  delivery?: DeliveryInfoUpdateDto[] | null;
}

export class DataDeliveryGetDto {
  @Expose()
  dataManagementSite: string;

  @Expose()
  acceptance: DeliveryAcceptance;

  @Expose()
  @Type(() => DeliveryInfoGetDto)
  @IsOptional()
  delivery?: DeliveryInfoGetDto[] | null;

  @Expose()
  @IsOptional()
  createdAt?: Date;

  @Expose()
  @IsOptional()
  updatedAt?: Date;
}
