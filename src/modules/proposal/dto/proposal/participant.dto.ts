import { Expose, Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { WithIdForArrayDto } from 'src/shared/dto/with-id-for-array.dto';
import InstituteDto from './participants/institute.dto';
import { ParticipantCategoryDto } from './participants/participant-category.dto';
import { ParticipantRoleDto } from './participants/participant-role.dto';
import { ResearcherDto } from './participants/researcher.dto';

// id is needed to keep reference to the specific array member
export class ParticipantDto extends WithIdForArrayDto {
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
  @Type(() => ParticipantCategoryDto)
  participantCategory: ParticipantCategoryDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => ParticipantRoleDto)
  participantRole: ParticipantRoleDto;

  @Expose()
  @IsOptional()
  @Type(() => Boolean)
  addedByFdpg: boolean;
}
