import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { ReportNotificationService } from './report-notification.service';
import { ReportDto } from 'src/modules/proposal/dto/proposal/report.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportService {
  constructor(private readonly reportNotificationService: ReportNotificationService) {}

  async handleCreate(proposal: Proposal, report: ReportDto, proposalUrl: string) {
    await this.reportNotificationService.handleReportCreate(proposal, report, proposalUrl);
  }
}
