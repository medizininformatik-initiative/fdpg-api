import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOAuth2,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Role } from '../enums/role.enum';
import { Roles } from './role.decorator';

export function Auth(...roles: Role[]) {
  const decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[] = [
    ApiUnauthorizedResponse(),
    ApiBearerAuth(),
    ApiOAuth2([]),
    UseGuards(JwtAuthGuard),
  ];

  if (roles?.length > 0) {
    decorators.push(Roles(...roles));
    decorators.push(
      ApiForbiddenResponse({
        description: `Required roles: </br> ${roles.join(', ')}`,
      }),
    );
    decorators.push(UseGuards(RoleGuard));
  }

  return applyDecorators(...decorators);
}
