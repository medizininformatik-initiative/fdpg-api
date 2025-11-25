import { Exclude, Expose, Transform } from 'class-transformer';
import { ArrayUnique, IsString } from 'class-validator';

@Exclude()
export class InitContractingDto {
  @Expose()
  @ArrayUnique()
  @Transform((params) => {
    return JSON.parse(params.value);
  })
  locations: string[];
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
