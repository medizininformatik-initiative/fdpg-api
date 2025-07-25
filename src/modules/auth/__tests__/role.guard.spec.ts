import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { trace } from '@opentelemetry/api';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { RoleGuard } from '../guards/role.guard';

describe('RoleGuard', () => {
  let guard: RoleGuard;
  let reflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(() => {
    guard = new RoleGuard(reflector as unknown as Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: {
            authorization: 'Bearer ...',
          },
        }),
      }),
    } as unknown as ExecutionContext;

    it('should open a trace', async () => {
      const endSpanMock = jest.fn();
      const startSpanMock = jest.fn().mockImplementation(() => {
        return { end: endSpanMock };
      });
      jest.spyOn(trace, 'getTracer').mockImplementation(() => {
        return {
          startSpan: startSpanMock,
        } as any;
      });

      guard.canActivate(context);

      expect(trace.getTracer).toHaveBeenCalledWith('basic');
      expect(startSpanMock).toHaveBeenCalledTimes(1);
      expect(endSpanMock).toHaveBeenCalledTimes(1);
    });

    it('should return true when no roles are required', () => {
      const result = guard.canActivate(context);
      expect(result).toEqual(true);
    });

    it('should return false if the user does not satisfy the roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce([Role.Admin]);

      const user = {
        roles: [Role.Researcher],
      } as Pick<IRequestUser, 'roles'>;

      const getRequestMock = jest.fn().mockImplementation(() => {
        return { user };
      });

      jest.spyOn(context, 'switchToHttp').mockImplementationOnce(() => ({ getRequest: getRequestMock }) as any);
      const result = guard.canActivate(context);
      expect(result).toEqual(false);
    });

    it('should return true if the user does satisfy the roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce([Role.Admin]);

      const user = {
        roles: [Role.Admin],
      } as Pick<IRequestUser, 'roles'>;

      const getRequestMock = jest.fn().mockImplementation(() => {
        return { user };
      });

      jest.spyOn(context, 'switchToHttp').mockImplementationOnce(() => ({ getRequest: getRequestMock }) as any);
      const result = guard.canActivate(context);
      expect(result).toEqual(true);
    });
  });
});
