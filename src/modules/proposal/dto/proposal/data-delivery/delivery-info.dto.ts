import { Expose, Type } from 'class-transformer';
import { IsArray, IsDate, IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { SubDeliveryGetDto, SubDeliveryUpdateDto } from './sub-delivery.dto';
import { DeliveryInfoStatus } from 'src/modules/proposal/enums/delivery-info-status.enum';

export class DeliveryInfoUpdateDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Expose()
  @Type(() => Date)
  @IsDate()
  deliveryDate: Date;

  @Expose()
  @IsEnum(DeliveryInfoStatus)
  status: DeliveryInfoStatus;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubDeliveryUpdateDto)
  subDeliveries: SubDeliveryUpdateDto[];
}

export class DeliveryInfoGetDto {
  @Expose()
  name: string;

  @Expose()
  @Type(() => Date)
  @IsDate()
  deliveryDate: Date;

  @Expose()
  @IsEnum(DeliveryInfoStatus)
  status: DeliveryInfoStatus;

  @Expose()
  @Type(() => SubDeliveryGetDto)
  subDeliveries: SubDeliveryGetDto[];

  @Expose()
  @Type(() => Date)
  createdAt?: Date;

  @Expose()
  @Type(() => Date)
  updatedAt?: Date;
}
