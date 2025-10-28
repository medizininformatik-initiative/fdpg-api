import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsAfterTodayUnlessRegister(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isAfterTodayUnlessRegister',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: any, args: ValidationArguments): boolean => {
          const validationGroups = (args as any).groups || [];
          const isRegisterValidation = validationGroups.includes('GROUP_IS_REGISTER');

          if (isRegisterValidation) {
            return true;
          }

          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const incomingDate = new Date(value);
          return startOfToday <= incomingDate;
        },
        defaultMessage: (validationArguments?: ValidationArguments): string =>
          `${validationArguments.value} should be after start of today in utc`,
      },
    });
  };
}
