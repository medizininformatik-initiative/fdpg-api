import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

interface IValidateWhenEmpty {
  otherField: string;
  validation: (...args: any) => boolean;
  otherFieldValidation: (...args: any) => boolean;
  defaultResetValue: any;
  validationOptions?: ValidationOptions;
}

export function ValidateWhenEmpty(property: IValidateWhenEmpty, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'validateWhenEmpty',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const { otherField, validation, otherFieldValidation, defaultResetValue } = args
            .constraints[0] as IValidateWhenEmpty;
          const otherValue = (args.object as any)[otherField];
          const isOtherValueValid = otherFieldValidation(otherValue);

          if (isOtherValueValid) {
            const isValueValid = validation(value);
            if (!isValueValid) {
              // It's not required here, but for sake of typesafety we reset the value
              value = defaultResetValue;
            }
            return true;
          } else {
            // Other field not existing: We need to fully validate here
            return validation(value);
          }
        },
        defaultMessage: (validationArguments?: ValidationArguments): string =>
          `One of the two fields ${validationArguments.property} or ${validationArguments.constraints[0].otherField} needs to be filled and both need to be validated correctly`,
      },
    });
  };
}
