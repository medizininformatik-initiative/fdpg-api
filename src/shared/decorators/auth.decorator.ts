import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiHeader, ApiOAuth2, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/modules/auth/guards/role.guard';
import { Role } from '../enums/role.enum';
import { Roles } from './role.decorator';

export function Auth(...roles: Role[]) {
  const decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[] = [
    ApiUnauthorizedResponse({ description: 'Unauthorized. User is not logged in or access token is not valid' }),
    ApiBearerAuth(),
    ApiOAuth2([]),
    UseGuards(JwtAuthGuard),
    ApiHeader({
      name: 'x-selected-role',
      description: 'Selected role of the user',
      required: roles?.length > 0,
      allowEmptyValue: !roles || roles.length === 0,
      enum: roles,
    }),
  ];

  if (roles?.length > 0) {
    decorators.push(Roles(...roles));
    decorators.push(
      ApiForbiddenResponse({
        description: `Forbidden. Item access could be (temporary) restricted or required roles are not given for the user. </br> Required roles:  ${roles.join(
          ', ',
        )}`,
      }),
    );
    decorators.push(UseGuards(RoleGuard));
  }

  return applyDecorators(...decorators);
}
