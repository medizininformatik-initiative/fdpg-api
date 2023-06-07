import { applyDecorators, UsePipes } from '@nestjs/common';
import { ApiBadRequestResponse } from '@nestjs/swagger';
import { ValidationExceptionDto } from 'src/shared/dto/validation/validation-exception.dto';
import { AdminValidationPipe } from '../validation.pipe';

/**
 * Shorthand Decorator for adding the admin validation and bad request error
 */
export function AdminValidation() {
  return applyDecorators(
    UsePipes(new AdminValidationPipe()),
    ApiBadRequestResponse({ type: () => ValidationExceptionDto }),
  );
}
