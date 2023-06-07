import { applyDecorators, UsePipes } from '@nestjs/common';
import { ApiBadRequestResponse } from '@nestjs/swagger';

import { ValidationExceptionDto } from 'src/shared/dto/validation/validation-exception.dto';
import { ProposalValidationPipe } from '../validation.pipe';

/**
 * Shorthand Decorator for adding the proposal validation and bad request error
 */
export function ProposalValidation(isCreation?: boolean) {
  return applyDecorators(
    UsePipes(new ProposalValidationPipe(isCreation)),
    ApiBadRequestResponse({ type: () => ValidationExceptionDto }),
  );
}
