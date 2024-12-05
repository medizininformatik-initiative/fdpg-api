import { Injectable } from '@nestjs/common';
import {
  isMongoId,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ProposalUpdateDto } from '../dto/proposal/proposal.dto';
import { ProposalCrudService } from '../services/proposal-crud.service';

@ValidatorConstraint({ async: true, name: 'isUniqueAbbreviation' })
@Injectable()
export class IsUniqueAbbreviationConstraint implements ValidatorConstraintInterface {
  constructor(private readonly proposalCrudService: ProposalCrudService) {}

  async validate(projectAbbreviation: any, args: ValidationArguments) {
    const object = args.object as ProposalUpdateDto;
    if (isMongoId(object._id) || !object._id) {
      return this.proposalCrudService.checkUnique({ projectAbbreviation }, object._id);
    } else {
      // We rely on the validation of the mongo id in the DTO
      return true;
    }
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return `${validationArguments.property} is already existing`;
  }
}

export function IsUniqueAbbreviation(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      async: true,
      name: 'isUniqueAbbreviation',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsUniqueAbbreviationConstraint,
    });
  };
}
