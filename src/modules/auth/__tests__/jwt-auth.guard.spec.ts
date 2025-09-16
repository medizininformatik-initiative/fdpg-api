import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { getError } from 'test/get-error';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('handleRequest', () => {
    beforeEach(() => {
      const context = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {
              authorization: 'Bearer ...',
            },
          }),
        }),
      } as unknown as ExecutionContext;

      guard.context = context;
    });

    const userToHandle: Partial<IRequestUser> = {
      isFromLocation: true,
      isKnownLocation: true,
      singleKnownRole: Role.DizMember,
    };

    it('should return the user if everything is ok', () => {
      const user = guard.handleRequest(undefined, userToHandle, undefined);
      expect(user).toEqual(userToHandle);
    });

    it('should open a trace on error ', async () => {
      const endSpanMock = jest.fn();
      const startSpanMock = jest.fn().mockImplementation(() => {
        return { end: endSpanMock };
      });
      jest.spyOn(trace, 'getTracer').mockImplementation(() => {
        return {
          startSpan: startSpanMock,
        } as any;
      });
      const call = guard.handleRequest.bind(guard);
      const error = await getError(async () => await call(new Error('test'), userToHandle, undefined));
      expect(error).toBeDefined();
      expect(trace.getTracer).toHaveBeenCalledWith('basic');
      expect(startSpanMock).toHaveBeenCalledTimes(1);
      expect(endSpanMock).toHaveBeenCalledTimes(1);
    });

    it('should throw if a user with role that requires a location has no location ', async () => {
      const call = guard.handleRequest.bind(guard);
      const userWithLocationProblem = {
        ...userToHandle,
        isFromLocation: true,
        isKnownLocation: false,
      };
      const error = await getError(async () => await call(undefined, userWithLocationProblem, undefined));
      expect(error).toBeInstanceOf(ForbiddenException);
    });
  });
});
