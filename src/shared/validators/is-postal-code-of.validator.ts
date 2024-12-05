import { isEnum, isPostalCode, registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { CountryCode } from '../enums/country-code.enum';

export function IsPostalCodeOf(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPostalCodeOf',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [countryCodeField] = args.constraints;
          const countryCode = (args.object as any)[countryCodeField];

          return isEnum(countryCode, CountryCode) && isPostalCode(value, countryCode);
        },
        defaultMessage: (validationArguments?: ValidationArguments): string =>
          `${validationArguments.property} should be a valid postal code for a known country`,
      },
    });
  };
}
