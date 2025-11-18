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
          ['proposal.accessGuard.requiredCondition']:
            'Researcher OR RegisteringMember OR FdpgMember OR DataSourceMember OR DizMember OR UacMember OR DataManagementOffice in roles',
          ['proposal.accessGuard.userSingleRole']: user.singleKnownRole,
          ['proposal.accessGuard.userRoles']: user.roles?.join(', ') || 'none',
        },
      })
      .end();

    const allowedRoles = [
      Role.Researcher,
      Role.RegisteringMember,
      Role.FdpgMember,
      Role.DataSourceMember,
      Role.DizMember,
      Role.UacMember,
      Role.DataManagementOffice,
    ];

    if (user.singleKnownRole && allowedRoles.includes(user.singleKnownRole)) {
      return true;
    }

    if (user.roles?.some((role: Role) => allowedRoles.includes(role))) {
      return true;
    }

    return false;
  }
}
