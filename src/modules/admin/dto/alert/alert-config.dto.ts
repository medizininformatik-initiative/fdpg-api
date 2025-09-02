import { Exclude, Expose, Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ConfigType } from '../../enums/config-type.enum';

@Exclude()
export class AlertConfigBaseDto {
  @Expose()
  @IsString()
  @IsOptional()
  @MaxLength(2048)
  logo?: string;

  @Expose()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
    return value;
  })
  @IsBoolean()
  isVisible: boolean;

  @Expose()
  @IsString()
  @MaxLength(10000)
  message: string;
}

@Exclude()
export class AlertConfigCreateDto extends AlertConfigBaseDto {}

@Exclude()
export class AlertConfigGetDto extends AlertConfigBaseDto {
  @Expose()
  type: ConfigType.Alert;

  @Exclude()
  updatedAt: Date;

  @Exclude()
  createdAt: Date;

  @Exclude()
  _id: string;
}
