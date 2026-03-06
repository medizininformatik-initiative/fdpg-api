import { Expose, Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { DeliveryAcceptance } from '../../../enums/data-delivery.enum';
import { DeliveryInfoGetDto, DeliveryInfoUpdateDto } from './delivery-info.dto';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';

export class DataDeliveryUpdateDto extends WithIdForObjectDto {
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
  deliveryInfos: DeliveryInfoUpdateDto[] | null;
}

export class DataDeliveryGetDto extends WithIdForObjectDto {
  @Expose()
  dataManagementSite: string;

  @Expose()
  acceptance: DeliveryAcceptance;

  @Expose()
  @Type(() => DeliveryInfoGetDto)
  @IsOptional()
  deliveryInfos: DeliveryInfoGetDto[] | null;

  @Expose()
  @IsOptional()
  createdAt: Date;

  @Expose()
  @IsOptional()
  updatedAt: Date;
}
