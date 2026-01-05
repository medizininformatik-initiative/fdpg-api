import { Expose, Transform, Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateIf, ValidateNested } from 'class-validator';
import InstituteDto from './participants/institute.dto';
import { ParticipantCategoryDto } from './participants/participant-category.dto';
import { ParticipantRoleDto } from './participants/participant-role.dto';
import { ResearcherDto } from './participants/researcher.dto';
import { ProjectResponsibilityDto } from './project-responsibility.dto';
import { UiNested } from 'src/shared/decorators/ui-widget.decorator';
import { OutputGroup } from 'src/shared/enums/output-group.enum';

export class ProjectResponsibleDto {
  @Expose()
  @ValidateNested()
  @IsObject()
  @UiNested(() => ResearcherDto)
  @ValidateIf((o: ProjectResponsibleDto) => !o.projectResponsibility.applicantIsProjectResponsible)
  @Transform(({ obj, value }) => (obj.projectResponsibility.applicantIsProjectResponsible ? undefined : value))
  researcher: ResearcherDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @UiNested(() => InstituteDto)
  @ValidateIf((o: ProjectResponsibleDto) => !o.projectResponsibility.applicantIsProjectResponsible)
  @Transform(({ obj, value }) => (obj.projectResponsibility.applicantIsProjectResponsible ? undefined : value))
  institute: InstituteDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @UiNested(() => ParticipantCategoryDto)
  @ValidateIf((o: ProjectResponsibleDto) => !o.projectResponsibility.applicantIsProjectResponsible)
  @Transform(({ obj, value }) => (obj.projectResponsibility.applicantIsProjectResponsible ? undefined : value))
  participantCategory: ParticipantCategoryDto;

  @Expose()
  @UiNested(() => ParticipantRoleDto)
  participantRole: ParticipantRoleDto;

  @Expose()
  @ValidateNested()
  @UiNested(() => ProjectResponsibilityDto)
  projectResponsibility: ProjectResponsibilityDto;

  @Expose()
  @IsOptional()
  @Type(() => Boolean)
  @Transform(({ value, options }) => {
    if (
      options?.groups?.includes(OutputGroup.FormSchemaOnly) ||
      options?.groups?.includes(OutputGroup.WithFormSchema)
    ) {
      return undefined;
    }
    return value;
  })
  addedByFdpg: boolean;
}
