import { Expose, Type } from 'class-transformer';
import { IsObject, ValidateNested } from 'class-validator';
import InstituteDto from './participants/institute.dto';
import { ParticipantCategoryOptionalDto } from './participants/participant-category.dto';
import { ResearcherDto } from './participants/researcher.dto';

export class ApplicantDto {
  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => ResearcherDto)
  researcher: ResearcherDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => InstituteDto)
  institute: InstituteDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => ParticipantCategoryOptionalDto)
  participantCategory: ParticipantCategoryOptionalDto;
}
