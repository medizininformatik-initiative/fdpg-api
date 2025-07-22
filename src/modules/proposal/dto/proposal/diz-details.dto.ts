import { Expose } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';

export class DizDetailsCreateDto {
  @Expose()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  localProjectIdentifier?: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  documentationLinks: string;
}

export class DizDetailsUpdateDto extends WithIdForObjectDto {
  @Expose()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  localProjectIdentifier?: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  documentationLinks: string;
}

export class DizDetailsGetDto extends WithIdForObjectDto {
  @Expose()
  location: MiiLocation;

  @Expose()
  localProjectIdentifier?: string;

  @Expose()
  documentationLinks: string;
}
