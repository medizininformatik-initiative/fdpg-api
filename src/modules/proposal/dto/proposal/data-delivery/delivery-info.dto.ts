import { Expose, Type } from 'class-transformer';
import { IsArray, IsDate, IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { SubDeliveryGetDto, SubDeliveryUpdateDto } from './sub-delivery.dto';
import { DeliveryInfoStatus } from 'src/modules/proposal/enums/delivery-info-status.enum';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';

export class DeliveryInfoUpdateDto extends WithIdForObjectDto {
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

export class DeliveryInfoGetDto extends WithIdForObjectDto {
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
  @IsDate()
  lastSynced: Date;

  @Expose()
  @Type(() => Date)
  createdAt?: Date;

  @Expose()
  @Type(() => Date)
  updatedAt?: Date;
}
