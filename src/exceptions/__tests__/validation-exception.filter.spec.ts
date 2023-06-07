import { ArgumentsHost } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { ValidationExceptionFilter } from '../validation/validation-exception.filter';
import { ValidationException } from '../validation/validation.exception';

describe('ValidationExceptionFilter', () => {
  let validationExceptionFilter: ValidationExceptionFilter;

  beforeEach(() => {
    validationExceptionFilter = new ValidationExceptionFilter();
  });

  it('should be defined', () => {
    expect(validationExceptionFilter).toBeDefined();
  });

  describe('catch', () => {
    const exception = {
      getStatus: jest.fn(),
      validationErrors: [new ValidationException([])],
    } as unknown as ValidationException;

    const host = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue({
          status: jest.fn().mockReturnValue({
            json: jest.fn(),
          }),
        }),
      }),
    } as unknown as ArgumentsHost;

    const endSpanMock = jest.fn();
    const startSpanMock = jest.fn().mockImplementation(() => {
      return { end: endSpanMock };
    });

    jest.spyOn(trace, 'getTracer').mockImplementation(() => {
      return {
        startSpan: startSpanMock,
      } as any;
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should trace the exception', () => {
      validationExceptionFilter.catch(exception, host);
      expect(trace.getTracer).toBeCalledWith('basic');
      expect(startSpanMock).toHaveBeenCalledTimes(1);
      expect(endSpanMock).toHaveBeenCalledTimes(1);
    });
  });
});
