import { Expose } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';

export class ResourceAndRecontact extends WithIdForObjectDto {
  @Expose()
  @IsBoolean()
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  hasEnoughResources: boolean;

  @Expose()
  @IsBoolean()
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  isRecontactingIntended: boolean;

  @Expose()
  @IsBoolean()
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  suppSurveyReContacting: boolean;

  @Expose()
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  suppSurveyReContactingText: string;

  @Expose()
  @IsBoolean()
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  reContactIncidental: boolean;

  @Expose()
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  reContactIncidentalText: string;

  @Expose()
  @IsBoolean()
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  urgentIncidentalReContacting: boolean;

  @Expose()
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  urgentIncidentalReContactingText: string;
}
