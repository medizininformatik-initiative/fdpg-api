import { Expose } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { ProjectUserType } from '../../enums/project-user-type.enum';
import { ProposalValidation } from '../../enums/porposal-validation.enum';

export class ProjectUserDto extends WithIdForObjectDto {
  @Expose()
  @IsEnum(ProjectUserType)
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  projectUserType: ProjectUserType;
}
