import { isNotEmpty, isString, registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export const isNotEmptyString = (value: unknown): boolean => isString(value) && isNotEmpty(value.trim());

export function IsNotEmptyString(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isNotEmptyString',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown): boolean => isNotEmptyString(value),
        defaultMessage: (validationArguments?: ValidationArguments): string =>
          `${validationArguments.property} should not be an empty string`,
      },
    });
  };
}
