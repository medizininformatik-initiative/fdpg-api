import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Role } from 'src/shared/enums/role.enum';
import { trace } from '@opentelemetry/api';

@Injectable()
export class ProposalAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const tracer = trace.getTracer('basic');
    const { user } = context.switchToHttp().getRequest();

    tracer
      .startSpan('Proposal Access Guard', {
        attributes: {
          ['proposal.accessGuard.requiredCondition']: 'Researcher OR RegisteringMember in roles',
          ['proposal.accessGuard.userSingleRole']: user.singleKnownRole,
          ['proposal.accessGuard.userRoles']: user.roles?.join(', ') || 'none',
        },
      })
      .end();

    // Allow if user is a Researcher (primary role)
    if (user.singleKnownRole === Role.Researcher) {
      return true;
    }

    // Allow if user has RegisteringMember among their roles
    if (user.roles?.includes(Role.RegisteringMember)) {
      return true;
    }
    return false;
  }
}
