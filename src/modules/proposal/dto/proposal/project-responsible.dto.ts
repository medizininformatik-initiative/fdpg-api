import { Expose, Transform, Type } from 'class-transformer';
import { IsObject, ValidateIf, ValidateNested } from 'class-validator';
import InstituteDto from './participants/institute.dto';
import { ParticipantCategoryDto } from './participants/participant-category.dto';
import { ResearcherDto } from './participants/researcher.dto';
import { ProjectResponsibilityDto } from './project-responsibility.dto';

export class ProjectResponsibleDto {
  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => ResearcherDto)
  @ValidateIf((o) => o.applicantIsProjectResponsible)
  @Transform(({ obj, value }) => (obj.applicantIsProjectResponsible ? undefined : value))
  researcher: ResearcherDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => InstituteDto)
  @ValidateIf((o) => o.applicantIsProjectResponsible)
  @Transform(({ obj, value }) => (obj.applicantIsProjectResponsible ? undefined : value))
  institute: InstituteDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => ParticipantCategoryDto)
  @ValidateIf((o) => o.applicantIsProjectResponsible)
  @Transform(({ obj, value }) => (obj.applicantIsProjectResponsible ? undefined : value))
  participantCategory: ParticipantCategoryDto;

  @Expose()
  @ValidateNested()
  @Type(() => ProjectResponsibilityDto)
  projectResponsibility: ProjectResponsibilityDto;
}
