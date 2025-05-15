import { Expose } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';

export class ResourceAndRecontact extends WithIdForObjectDto {
  @Expose()
  @IsBoolean()
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  hasEnoughResources: boolean;

  @Expose()
  @IsBoolean()
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  isRecontactingIntended: boolean;

  @Expose()
  @IsBoolean()
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  suppSurveyReContacting: boolean;

  @Expose()
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  suppSurveyReContactingText: string;

  @Expose()
  @IsBoolean()
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  reContactIncidental: boolean;

  @Expose()
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  reContactIncidentalText: string;

  @Expose()
  @IsBoolean()
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  urgentIncidentalReContacting: boolean;

  @Expose()
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  urgentIncidentalReContactingText: string;
}
