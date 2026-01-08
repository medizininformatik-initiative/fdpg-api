import { Expose } from 'class-transformer';
import { IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { WithIdForArrayDto } from 'src/shared/dto/with-id-for-array.dto';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { PublicationType } from '../../../enums/publication-type.enum';
import { UiWidget } from 'src/shared/decorators/ui-widget.decorator';

export class PublicationDto extends WithIdForArrayDto {
  @Expose()
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsRegister] })
  @IsEnum(PublicationType)
  @UiWidget({ type: 'select', format: 'single' })
  type: PublicationType;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsRegister] })
  @MaxLength(10000)
  @UiWidget({ type: 'richtext' })
  description: string;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsRegister] })
  @MaxLength(10000)
  @UiWidget({ type: 'textfield' })
  authors: string;
}
