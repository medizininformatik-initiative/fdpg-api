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
            'Researcher OR RegisteringMember OR FdpgMember OR DataSourceMember OR DataManagementOffice OR DizMember OR UacMember in roles',
          ['proposal.accessGuard.userSingleRole']: user.singleKnownRole,
          ['proposal.accessGuard.userRoles']: user.roles?.join(', ') || 'none',
        },
      })
      .end();

    const hasToBeSelected = [
      Role.Researcher,
      Role.FdpgMember,
      Role.DataSourceMember,
      Role.DataManagementOffice,
      Role.DizMember,
      Role.UacMember,
    ];

    const passiveAssigned = [Role.RegisteringMember];

    if (user.singleKnownRole && hasToBeSelected.includes(user.singleKnownRole)) {
      return true;
    }

    if ((user.roles || []).some((role: Role) => passiveAssigned.includes(role))) {
      return true;
    }

    return false;
  }
}
