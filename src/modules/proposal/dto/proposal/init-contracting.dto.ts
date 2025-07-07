import { Exclude, Expose, Transform } from 'class-transformer';
import { ArrayUnique, IsEnum, IsString } from 'class-validator';
import { MiiLocation } from 'src/shared/constants/mii-locations';

@Exclude()
export class InitContractingDto {
  @Expose()
  @IsEnum(MiiLocation, { each: true })
  @ArrayUnique()
  @Transform((params) => {
    return JSON.parse(params.value);
  })
  locations: MiiLocation[];
}

@Exclude()
export class UpdateContractingDto {
  @Expose()
  @IsString()
  @Transform((params) => {
    return params.value;
  })
  uploadId: string;
}
