import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, validateSync } from 'class-validator';
import { DifeVariableSelectionDataDto } from './variable-selection-data.dto';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';

@ValidatorConstraint({ name: 'IsValidVariableSelection', async: false })
export class IsValidVariableSelectionConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (typeof value !== 'object') return false;

    const keys = Object.keys(value);
    for (const key of keys) {
      if (!(key in PlatformIdentifier)) return false;

      const item = value[key];

      if (key === PlatformIdentifier.DIFE) {
        const errors = validateSync(Object.assign(new DifeVariableSelectionDataDto(), item));
        if (errors.length > 0) {
          console.error(`Validation failed for ${key}`, errors);
          return false;
        }
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `Invalid keys or structure in variableSelection`;
  }
}
