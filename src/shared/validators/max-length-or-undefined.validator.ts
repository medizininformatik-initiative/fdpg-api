import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { maxLength } from 'class-validator';

export function MaxLengthOrUndefined(maxCharacters: number, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'maxLengthOrUndefined',
      target: object.constructor,
      propertyName,
      constraints: [maxCharacters],
      options: validationOptions,
      validator: {
        validate: (value: string | undefined, args: ValidationArguments): boolean => {
          if (value === undefined) {
            return true;
          } else {
            return maxLength(value, args.constraints[0]);
          }
        },
        defaultMessage: (validationArguments?: ValidationArguments): string =>
          `${validationArguments.value} should be undefined or less than ${maxCharacters} characters`,
      },
    });
  };
}
