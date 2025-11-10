import { Expose } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { IsValidId } from 'src/shared/validators/is-valid-id.validator';
import { SubDeliveryStatus } from '../../../enums/data-delivery.enum';

export class SubDeliveryUpdateDto extends WithIdForObjectDto {
  @Expose()
  @IsString()
  @IsValidId()
  location: string;

  @Expose()
  @IsEnum(SubDeliveryStatus)
  status: SubDeliveryStatus;
}

export class SubDeliveryGetDto extends WithIdForObjectDto {
  @Expose()
  location: string;

  @Expose()
  status: SubDeliveryStatus;

  @Expose()
  @IsOptional()
  createdAt?: Date;

  @Expose()
  @IsOptional()
  updatedAt?: Date;
}
