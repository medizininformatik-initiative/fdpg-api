import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/shared/decorators/role.decorator';
import { Role } from 'src/shared/enums/role.enum';
import { trace } from '@opentelemetry/api';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const tracer = trace.getTracer('basic');

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    tracer
      .startSpan('Role Guard', {
        attributes: {
          ['jwt.roleGuard.requiredRoles']: requiredRoles?.join(', '),
        },
      })
      .end();

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
