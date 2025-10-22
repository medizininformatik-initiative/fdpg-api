import { Expose, Transform, Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateIf, ValidateNested } from 'class-validator';
import InstituteDto from './participants/institute.dto';
import { ParticipantCategoryDto } from './participants/participant-category.dto';
import { ParticipantRoleDto } from './participants/participant-role.dto';
import { ResearcherDto } from './participants/researcher.dto';
import { ProjectResponsibilityDto } from './project-responsibility.dto';

export class ProjectResponsibleDto {
  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => ResearcherDto)
  @ValidateIf((o: ProjectResponsibleDto) => !o.projectResponsibility.applicantIsProjectResponsible)
  @Transform(({ obj, value }) => (obj.projectResponsibility.applicantIsProjectResponsible ? undefined : value))
  researcher: ResearcherDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => InstituteDto)
  @ValidateIf((o: ProjectResponsibleDto) => !o.projectResponsibility.applicantIsProjectResponsible)
  @Transform(({ obj, value }) => (obj.projectResponsibility.applicantIsProjectResponsible ? undefined : value))
  institute: InstituteDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => ParticipantCategoryDto)
  @ValidateIf((o: ProjectResponsibleDto) => !o.projectResponsibility.applicantIsProjectResponsible)
  @Transform(({ obj, value }) => (obj.projectResponsibility.applicantIsProjectResponsible ? undefined : value))
  participantCategory: ParticipantCategoryDto;

  @Expose()
  @Type(() => ParticipantRoleDto)
  participantRole: ParticipantRoleDto;

  @Expose()
  @ValidateNested()
  @Type(() => ProjectResponsibilityDto)
  projectResponsibility: ProjectResponsibilityDto;

  @Expose()
  @IsOptional()
  @Type(() => Boolean)
  addedByFdpg: boolean;
}
