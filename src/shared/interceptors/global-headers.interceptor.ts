import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

import { Response as ExpressResponse } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GlobalHeadersInterceptor implements NestInterceptor {
  softwareVersion: string;
  buildDate: string;
  buildNoOfDate: string;
  env: string;
  sourceBranch: string;

  constructor(private readonly configService: ConfigService) {
    this.softwareVersion = this.configService.get('SOFTWARE_VERSION');
    this.buildDate = this.configService.get('BUILD_DATE');
    this.buildNoOfDate = this.configService.get('BUILD_NO_OF_DATE');
    this.env = this.configService.get('ENV');
    this.sourceBranch = this.configService.get('SOURCE_BRANCH');
  }
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ResponseObj: ExpressResponse = context.switchToHttp().getResponse();
    ResponseObj.setHeader(
      'x-software-version',
      `fdpg-api-v${this.softwareVersion}-${this.buildDate}+${this.buildNoOfDate}-${this.env}+sb=${this.sourceBranch}`,
    );
    return next.handle();
  }
}
