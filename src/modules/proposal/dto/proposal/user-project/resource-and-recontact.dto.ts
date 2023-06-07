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
}
