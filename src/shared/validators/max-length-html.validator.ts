import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function MaxLengthHtml(maxCharacters: number, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'maxLengthHtml',
      target: object.constructor,
      propertyName,
      constraints: [maxCharacters],
      options: validationOptions,
      validator: {
        validate: (value: string | undefined, args: ValidationArguments): boolean => {
          if (!value) {
            return true;
          }
          // Remove HTML tags and count only actual text content
          const textLength = value.replace(/<[^>]*>/g, '').length;
          return textLength <= args.constraints[0];
        },
        defaultMessage: (validationArguments?: ValidationArguments): string =>
          `${validationArguments.property} should be less than ${maxCharacters} characters`,
      },
    });
  };
}
