import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { ExposeId } from '../decorators/transform/expose-id.decorator';

// To be used for ids in objects.
// The id field gets stripped out so it won't overwrite the original
@Exclude()
export class WithIdForObjectDto {
  @ApiProperty({ description: '_id to be used for adding tasks. Changes will be ignored' })
  @ExposeId({ groups: [ProposalValidation.IsOutput] })
  /**
   * Id to be used for adding tasks or marking sections as done
   */
  _id?: string;

  @ApiProperty({ description: 'Changes will be ignored' })
  @Expose({ groups: [ProposalValidation.IsOutput] })
  isDone?: boolean;
}
