import { applyDecorators, UsePipes } from '@nestjs/common';
import { ApiBadRequestResponse } from '@nestjs/swagger';
import { ValidationExceptionDto } from 'src/shared/dto/validation/validation-exception.dto';
import { CommentValidationPipe } from '../validation.pipe';

/**
 * Shorthand Decorator for adding the comment validation and bad request error
 */
export function CommentValidation() {
  return applyDecorators(
    UsePipes(new CommentValidationPipe()),
    ApiBadRequestResponse({ type: () => ValidationExceptionDto }),
  );
}
