import { UploadType, UseCaseUpload } from '../enums/upload-type.enum';
import { v4 as uuid } from 'uuid';
import { Proposal } from '../schema/proposal.schema';
import { UploadDto } from '../dto/upload.dto';
import { ReportDto } from '../dto/proposal/report.dto';

const getBasePath = (proposalId: string, type: UploadType): string => `proposal/${proposalId}/${type}/`;

export const getBlobName = (proposalId: string, type: UploadType, subId?: string): string => {
  return `${getBasePath(proposalId, type)}${getSubPath(subId)}${uuid()}`;
};

export const getProposalBlobName = (proposalId: string, projectAbbreviation: string, type: UploadType) => {
  if (type === UseCaseUpload.ProposalPDF) {
    const blobInstanceName = `${projectAbbreviation}_proposal`;

    return `${getBasePath(proposalId, type)}${blobInstanceName}`;
  }

  throw new Error(
    `type '${type}' of proposalId '${proposalId}' does not match requirement '${UseCaseUpload.ProposalPDF}'`,
  );
};

const getSubPath = (subId?: string): string => {
  return subId ? subId + '/' : '';
};

export const addUpload = (proposal: Proposal, upload: UploadDto): void => {
  if (proposal.uploads) {
    proposal.uploads.push(upload);
  } else {
    proposal.uploads = [upload];
  }
};

export const addReport = (proposal: Proposal, report: ReportDto): void => {
  if (proposal.reports) {
    proposal.reports.push(report);
  } else {
    proposal.reports = [report];
  }
};

export const addReportUpload = (report: ReportDto, upload: UploadDto): void => {
  if (report.uploads) {
    report.uploads.push(upload);
  } else {
    report.uploads = [upload];
  }
};
