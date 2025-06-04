import { ArgumentMetadata } from '@nestjs/common';
import { ClassConstructor, ClassTransformOptions, plainToClass } from 'class-transformer';
import { isObject, ValidationError } from 'class-validator';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { ValidationErrorInfo } from '../dto/validation/validation-error-info.dto';
import { FileDto } from '../dto/file.dto';

export const transForm = (
  objectToTransform: Record<string, any>,
  cls: ClassConstructor<unknown>,
  options?: ClassTransformOptions,
) => {
  const object = plainToClass(cls, objectToTransform, options);
  if (!isObject(objectToTransform)) {
    throw new Error('Expected value to be of type object');
  }
  return object;
};

export const tryPlainToClass = (value: any, argumentMetadata: ArgumentMetadata, options?: ClassTransformOptions) => {
  try {
    if (value?.fieldname && value?.encoding && value?.size && value?.mimetype) {
      // We assume we have a file and return it without transformation
      return transForm(value, FileDto, options);
    }

    if (Array.isArray(value) && value[0]?.encoding && value[0]?.size && value[0]?.mimetype) {
      // We assume we have an array of files and return it without transformation
      return value.map((file) => transForm(file, FileDto, options));
    }

    if (!value && argumentMetadata.type === 'custom') {
      // We assume we expected a file but it is undefined. Further validation would fail with undefined. So we return empty object
      return transForm({}, FileDto, options);
    }

    if (Array.isArray(value) && argumentMetadata.type === 'custom') {
      // We assume we expected an array of files but it is empty.
      return [];
    }

    return transForm(value, argumentMetadata.metatype, options);
  } catch (error) {
    const errorInfo = new ValidationErrorInfo({
      constraint: 'transform',
      message: 'it was not possible to convert the plain JSON to Class Object: ' + argumentMetadata.metatype.name,
      property: JSON.stringify(value),
      code: JSON.stringify(error),
    });
    throw new ValidationException([errorInfo]);
  }
};

export const getErrorMessages = (errors: ValidationError[], scope: string[] = []) => {
  return errors.reduce((acc, error) => {
    if (error.constraints) {
      const scopeProperty = scope.length > 0 ? scope.join('.') + '.' : '';
      const property = scopeProperty + error.property;
      const errorInfo: ValidationErrorInfo[] = Object.keys(error.constraints).map(
        (constraintKey) =>
          new ValidationErrorInfo({
            constraint: constraintKey,
            message: error.constraints[constraintKey],
            property: property,
            code: error.contexts ? error.contexts[constraintKey][0] : undefined,
          }),
      );

      acc.push(...errorInfo);
    } else if (error.children.length > 0) {
      const newScope = [...scope, error.property];
      const messages = getErrorMessages(error.children, newScope);
      acc.push(...messages);
    }
    return acc;
  }, [] as ValidationErrorInfo[]);
};
