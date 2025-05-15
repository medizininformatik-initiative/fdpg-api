import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { validate } from 'class-validator';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { MongoIdParamDto } from 'src/shared/dto/mongo-id-param.dto';
import { getErrorMessages, tryPlainToClass } from 'src/shared/utils/validation-pipe.utils';
import { ProposalBaseDto } from './dto/proposal/proposal.dto';
import { ProposalValidation } from './enums/porposal-validation.enum';
import { ProposalStatus } from './enums/proposal-status.enum';
import { ProposalTypeOfUse } from './enums/proposal-type-of-use.enum';
import { FileDto } from 'src/shared/dto/file.dto';
import { PlatformIdentifier } from '../admin/enums/platform-identifier.enum';

// Attention: Pipe will return the transformed object and not the input value!
// This might cause stripping out properties and therefore unexpected behavior!
@Injectable()
export class ProposalValidationPipe implements PipeTransform<any> {
  private isCreation: boolean;

  constructor(isCreation?: boolean) {
    this.isCreation = isCreation;
  }

  async transform(value: any, argumentMetadata: ArgumentMetadata) {
    let object: ProposalBaseDto | MongoIdParamDto | any;
    const transformGroups = this.getValidationGroups(object);
    object = tryPlainToClass(value, argumentMetadata, { groups: transformGroups, excludeExtraneousValues: true });

    const groups = this.getValidationGroups(object);

    const errors = await validate(object, { always: true, groups });
    const errorMessages = getErrorMessages(errors);

    if (errors.length > 0) {
      // For some reason since class-validator 14 we fail on validating files. So we filter those errors out. (noticed for reports)
      const filteredErrors = errors.filter((error) => {
        if (Array.isArray(error.target)) {
          const targets = error.target.filter((target) => {
            return !(target instanceof FileDto);
          });
          return targets.length > 0;
        } else {
          return !(error.target instanceof FileDto);
        }
      });

      if (filteredErrors.length <= 0) {
        return object;
      } else {
        throw new ValidationException(errorMessages);
      }
    }

    return object;
  }

  private getValidationGroups(object: ProposalBaseDto | MongoIdParamDto): ProposalValidation[] {
    // There must be at least one group, otherwise all validations depending on groups will fail
    const groups = [ProposalValidation.Default];

    if (!this.isCreation) {
      groups.push(ProposalValidation.IsNotCreation);
    }

    if (!(object instanceof ProposalBaseDto)) {
      return groups;
    }

    // Everything below should be specific to proposals
    if (object.status === ProposalStatus.Draft) {
      groups.push(ProposalValidation.IsDraft);
      // If draft, we add no extra validations
      return groups;
    }

    groups.push(ProposalValidation.IsNotDraft);

    if (object.userProject?.typeOfUse?.usage?.includes(ProposalTypeOfUse.Biosample)) {
      groups.push(ProposalValidation.IsBiosampleType);
    }

    // If DIFE is selected, add DIFE validation group
    if (object.selectedDataSources?.includes(PlatformIdentifier.DIFE)) {
      groups.push(ProposalValidation.IsDIFEDataSource);
    }

    return groups;
  }
}
