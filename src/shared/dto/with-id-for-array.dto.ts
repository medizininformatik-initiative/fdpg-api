import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { ExposeId } from '../decorators/transform/expose-id.decorator';
import { IsValidId } from '../validators/is-valid-id.validator';

// To be used for items inside arrays, as the id won't be stripped out.
// That makes it possible to keep the reference to the item
@Exclude()
export class WithIdForArrayDto {
  @ApiProperty({
    description:
      '_id to be used for adding tasks. If you like to push a new item into the array: Use "NEW_ID" as the value for "_id". Id keeps reference inside the array. Make sure to pass it on update and not to on creation of proposal',
  })
  @IsValidId({ groups: [ProposalValidation.IsNotCreation] })
  @ExposeId({ groups: [ProposalValidation.IsNotCreation, ProposalValidation.IsOutput] })
  /**
   * Id to be used for adding tasks
   */
  _id?: string;
}
