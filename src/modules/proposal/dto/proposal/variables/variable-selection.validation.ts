import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';

@ValidatorConstraint({ name: 'IsValidVariableSelection', async: false })
export class IsValidVariableSelectionConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (typeof value !== 'object') return false;

    const keys = Object.keys(value);
    for (const key of keys) {
      if (!(key in PlatformIdentifier)) return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `Invalid keys or structure in variableSelection`;
  }
}
