import { applyDecorators, UsePipes } from '@nestjs/common';
import { ApiBadRequestResponse } from '@nestjs/swagger';
import { ValidationExceptionDto } from 'src/shared/dto/validation/validation-exception.dto';
import { UserValidationPipe } from '../validation.pipe';

/**
 * Shorthand Decorator for adding the user validation and bad request error
 */
export function UserValidation() {
  return applyDecorators(
    UsePipes(new UserValidationPipe()),
    ApiBadRequestResponse({ type: () => ValidationExceptionDto }),
  );
}
