import { Expose } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { ParticipantType } from 'src/modules/proposal/enums/participant-type.enum';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { UiWidget } from 'src/shared/decorators/ui-widget.decorator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';

export class ParticipantCategoryDto extends WithIdForObjectDto {
  @Expose()
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsRegister] })
  @IsEnum(ParticipantType)
  @UiWidget({ type: 'select', format: 'single' })
  category: ParticipantType;
}

export class ParticipantCategoryOptionalDto extends WithIdForObjectDto {
  @Expose()
  @IsOptional()
  @IsEnum(ParticipantType)
  @UiWidget({ type: 'select', format: 'single' })
  category: ParticipantType;
}
