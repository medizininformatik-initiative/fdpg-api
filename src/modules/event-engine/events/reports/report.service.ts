import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { ReportNotificationService } from './report-notification.service';
import { ReportDto } from 'src/modules/proposal/dto/proposal/report.dto';
import { Injectable } from '@nestjs/common';
import { RegisterFormService } from 'src/modules/proposal/services/register-form.service';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { files } from 'jszip';

@Injectable()
export class ReportService {
  constructor(
    private readonly reportNotificationService: ReportNotificationService,
    private readonly registerFormService: RegisterFormService,
  ) {}

  async handleCreate(
    proposal: Proposal,
    report: ReportDto,
    proposalUrl: string,
    files: Express.Multer.File[],
    user: IRequestUser,
  ) {
    await this.reportNotificationService.handleReportCreate(proposal, report, proposalUrl);
    await this.registerFormService.handleReportCreate(proposal, report, files, user);
  }
}
