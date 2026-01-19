import { Expose } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { ParticipantRoleType } from 'src/modules/proposal/enums/participant-role-type.enum';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { UiWidget } from 'src/shared/decorators/ui-widget.decorator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';

export class ParticipantRoleDto extends WithIdForObjectDto {
  @Expose()
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @IsEnum(ParticipantRoleType)
  @UiWidget({ type: 'select', format: 'single' })
  role: ParticipantRoleType;
}
