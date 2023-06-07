import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { ValidationExceptionDto } from 'src/shared/dto/validation/validation-exception.dto';
import { ValidationException } from './validation.exception';
import { trace } from '@opentelemetry/api';

/**
 * Export validation filter
 *
 * @class ValidationFilter
 * @implements ExceptionFilter
 * */
@Catch(ValidationException)
export class ValidationExceptionFilter implements ExceptionFilter {
  /**
   * @member catch
   *
   * @param {ValidationException} exception
   * @param {ArgumentsHost} host
   *
   * @returns {void}
   * */
  catch(exception: ValidationException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();

    const body = new ValidationExceptionDto(exception);
    response.status(status).json(body);
    const errorsForTrace = body.errors?.reduce((acc, error, idx) => {
      acc[`validation.error[${idx}]`] = JSON.stringify(error);
      return acc;
    }, {});
    const tracer = trace.getTracer('basic');
    tracer
      .startSpan('Validation Exception Filter', {
        attributes: {
          ...errorsForTrace,
        },
      })
      .end();
  }
}
