import { Expose, Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import InstituteDto from './participants/institute.dto';
import { ParticipantCategoryOptionalDto } from './participants/participant-category.dto';
import { ResearcherDto } from './participants/researcher.dto';
import { ParticipantRoleDto } from './participants/participant-role.dto';
import { UiNested } from 'src/shared/decorators/ui-widget.decorator';

export class ApplicantDto {
  @Expose()
  @ValidateNested()
  @IsObject()
  @UiNested(() => ResearcherDto)
  researcher: ResearcherDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @UiNested(() => InstituteDto)
  institute: InstituteDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @UiNested(() => ParticipantCategoryOptionalDto)
  participantCategory: ParticipantCategoryOptionalDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @IsOptional()
  @UiNested(() => ParticipantRoleDto)
  participantRole: ParticipantRoleDto;
}
