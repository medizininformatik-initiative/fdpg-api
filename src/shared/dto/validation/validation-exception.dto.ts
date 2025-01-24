import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { ValidationErrorInfo } from './validation-error-info.dto';

export class ValidationExceptionDto {
  constructor(exception: ValidationException) {
    this.errors = exception.validationErrors;
    console.log({ exception });
  }
  readonly errors: ValidationErrorInfo[];
  readonly errorMessage = 'Validation Exception';
}
