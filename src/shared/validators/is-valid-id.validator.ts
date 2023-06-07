import { isMongoId, registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsValidId(validationOptions?: ValidationOptions) {
  return (object: Object, propertyName: string) => {
    registerDecorator({
      name: 'isValidId',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: string): boolean => {
          return value === 'NEW_ID' ? true : isMongoId(value);
        },
        defaultMessage: (validationArguments?: ValidationArguments): string =>
          `${validationArguments.property} should be a valid id`,
      },
    });
  };
}
