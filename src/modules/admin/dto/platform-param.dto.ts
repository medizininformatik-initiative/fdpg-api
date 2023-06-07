import { Expose } from 'class-transformer';
import { IsEnum } from 'class-validator';
import { PlatformIdentifier } from '../enums/platform-identifier.enum';

export class PlatformParamDto {
  @Expose()
  @IsEnum(PlatformIdentifier)
  platform: PlatformIdentifier;
}
