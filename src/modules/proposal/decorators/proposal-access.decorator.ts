import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiHeader, ApiOAuth2, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ProposalAccessGuard } from '../guards/proposal-access.guard';

export function ProposalAccess() {
  return applyDecorators(
    ApiUnauthorizedResponse({ description: 'Unauthorized. User is not logged in or access token is not valid' }),
    ApiBearerAuth(),
    ApiOAuth2([]),
    UseGuards(JwtAuthGuard),
    ApiHeader({
      name: 'x-selected-role',
      description: 'Selected role of the user',
      required: false,
      allowEmptyValue: true,
    }),
    ApiForbiddenResponse({
      description: 'Forbidden. Access restricted to the users with RegisteringMember role.',
    }),
    UseGuards(ProposalAccessGuard),
  );
}
