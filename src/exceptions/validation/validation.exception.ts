import { BadRequestException } from '@nestjs/common';
import { ValidationErrorInfo } from 'src/shared/dto/validation/validation-error-info.dto';

/**

 * @class ValidationException
 * @extends BadRequestException
 * */
export class ValidationException extends BadRequestException {
  /**
   * @constructor
   *
   * @param {ValidationError} validationErrors
   * */
  constructor(public validationErrors: ValidationErrorInfo[]) {
    super();
  }
}
