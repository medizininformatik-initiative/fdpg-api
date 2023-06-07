import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { ValidationErrorInfo } from '../dto/validation/validation-error-info.dto';
import { BadRequestError } from '../enums/bad-request-error.enum';

/**
 * Validates if given ids are the same.
 * Needed as the pipe validation checks just the model id.
 * So we can compare param id and body id
 */
export const validateMatchingId = (idA: string, idB: string): void => {
  if (idA !== idB) {
    const errorInfo = new ValidationErrorInfo({
      constraint: 'isMatchingId',
      message: 'there is a mismatch between the id in the parameter and inside the body',
      property: '_id',
      code: BadRequestError.IdMismatchBetweenParamAndBody,
    });
    throw new ValidationException([errorInfo]);
  }
};
