import { Expose } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { UiWidget } from 'src/shared/decorators/ui-widget.decorator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';

export class ResourceAndRecontact extends WithIdForObjectDto {
  @Expose()
  @IsBoolean()
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  @UiWidget({ type: 'checkbox' })
  hasEnoughResources: boolean;

  @Expose()
  @IsBoolean()
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  @UiWidget({ type: 'checkbox' })
  isRecontactingIntended: boolean;

  @Expose()
  @IsBoolean()
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  @UiWidget({ type: 'checkbox' })
  suppSurveyReContacting: boolean;

  @Expose()
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  @UiWidget({ type: 'richtext' })
  suppSurveyReContactingText: string;

  @Expose()
  @IsBoolean()
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  @UiWidget({ type: 'richtext' })
  reContactIncidental: boolean;

  @Expose()
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  @UiWidget({ type: 'richtext' })
  reContactIncidentalText: string;

  @Expose()
  @IsBoolean()
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  @UiWidget({ type: 'checkbox' })
  urgentIncidentalReContacting: boolean;

  @Expose()
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  @UiWidget({ type: 'richtext' })
  urgentIncidentalReContactingText: string;
}
