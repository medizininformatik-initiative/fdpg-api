import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export const isAfterToday = (value: string): boolean => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const incomingDate = new Date(value);
  return startOfToday <= incomingDate;
};
export function IsAfterToday(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isAfterToday',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: any): boolean => isAfterToday(value),
        defaultMessage: (validationArguments?: ValidationArguments): string =>
          `${validationArguments.value} should be after start of today in utc`,
      },
    });
  };
}
