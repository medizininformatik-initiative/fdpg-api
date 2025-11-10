import { Expose, Type } from 'class-transformer';
import { IsArray, IsDate, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { SubDeliveryGetDto, SubDeliveryUpdateDto } from './sub-delivery.dto';

export class DeliveryInfoUpdateDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Expose()
  @Type(() => Date)
  @IsDate()
  date: Date;

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
  date: Date;

  @Expose()
  @Type(() => SubDeliveryGetDto)
  subDeliveries: SubDeliveryGetDto[];
}
