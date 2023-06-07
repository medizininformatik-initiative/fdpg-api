import { ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { trace } from '@opentelemetry/api';
import { IRequestUser } from 'src/shared/types/request-user.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    this.context = context;
    return super.canActivate(context);
  }

  context: ExecutionContext;

  handleRequest(err, user, info) {
    const requestUser = user as IRequestUser;
    const httpRequestContext = this.context.switchToHttp().getRequest();
    const currentAccessHeader = httpRequestContext.headers.authorization ?? 'NOT_EXISTING';

    if (err || !requestUser) {
      const tracer = trace.getTracer('basic');
      tracer
        .startSpan('JWT Strategy Error', {
          attributes: {
            ['jwt.authGuard.headerAuth']: currentAccessHeader,
            ['jwt.authGuard.jwtError']: JSON.stringify(err),
            ['jwt.authGuard.jwtInfo']: JSON.stringify(info),
          },
        })
        .end();
      throw err || new UnauthorizedException();
    } else if (requestUser.isFromLocation && !requestUser.isKnownLocation) {
      // We set the user to the request to let telemetry know about the context
      httpRequestContext.user = requestUser;
      throw new ForbiddenException(
        `Role ${requestUser.singleKnownRole} requires a valid location. Current Location: ${
          requestUser.miiLocation || 'NOT_SET'
        }`,
      );
    }

    return requestUser as any;
  }
}
