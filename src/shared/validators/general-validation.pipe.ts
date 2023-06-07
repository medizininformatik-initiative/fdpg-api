import { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { validate } from 'class-validator';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { getErrorMessages, tryPlainToClass } from 'src/shared/utils/validation-pipe.utils';

// Class that can be extended to add the most default validation

// Attention: Pipe will return the transformed object and not the input value!
// This might cause stripping out properties and therefore unexpected behavior!

export abstract class GeneralValidationPipe implements PipeTransform<any> {
  async transform(value: any, argumentMetadata: ArgumentMetadata) {
    let object: any;
    object = tryPlainToClass(value, argumentMetadata);

    const errors = await validate(object, {
      always: true,
      groups: ['GENERAL_DEFAULT_GROUP'],
      excludeExtraneousValues: true,
    });
    const errorMessages = getErrorMessages(errors);

    if (errors.length > 0) {
      throw new ValidationException(errorMessages);
    }
    return object;
  }
}
