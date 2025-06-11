import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { SelectedCohortDto } from './proposal/user-project/selected-cohort.dto';

@Exclude()
export class CohortUploadDto {
  @ApiProperty({
    type: 'string',
    name: 'file',
    format: 'binary',
  })
  file: any;

  @Expose()
  @Transform((obj) => {
    console.log({ obj });

    return obj;
  })
  newCohort: SelectedCohortDto;
}
