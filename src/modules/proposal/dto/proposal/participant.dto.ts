import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { WithIdForArrayDto } from 'src/shared/dto/with-id-for-array.dto';
import InstituteDto from './participants/institute.dto';
import { ParticipantCategoryDto } from './participants/participant-category.dto';
import { ParticipantRoleDto } from './participants/participant-role.dto';
import { ResearcherDto } from './participants/researcher.dto';
import { UiNested } from 'src/shared/decorators/ui-widget.decorator';
import { OutputGroup } from 'src/shared/enums/output-group.enum';

// id is needed to keep reference to the specific array member
export class ParticipantDto extends WithIdForArrayDto {
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
  @UiNested(() => ParticipantCategoryDto)
  participantCategory: ParticipantCategoryDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @UiNested(() => ParticipantRoleDto)
  participantRole: ParticipantRoleDto;

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
