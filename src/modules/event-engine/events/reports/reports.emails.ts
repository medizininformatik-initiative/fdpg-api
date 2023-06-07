import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { IEmail } from 'src/modules/email/types/email.interface';
import { ReportDto } from 'src/modules/proposal/dto/proposal/report.dto';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';

export const getReportCreateEmailForFdpgMember = (
  validContacts: string[],
  proposal: Proposal,
  report: ReportDto,
  proposalUrl: string,
): IEmail => {
  return {
    to: validContacts,
    categories: [EmailCategory.ReportCreate],
    subject: 'Bericht hinzugefügt',
    text: `Liebes FDPG Team,\n\nes wurde ein Bericht zum Antrag "${proposal.projectAbbreviation}" hinzugefügt. Bitte prüfen Sie den Bericht mit dem Titel "${report.title}" auf der Antragsseite des Forschungsdatenportals.\n\n ${proposalUrl}`,
  };
};

export const getReportUpdateEmailForFdpgMember = (
  validContacts: string[],
  proposal: Proposal,
  report: ReportDto,
  proposalUrl: string,
): IEmail => {
  return {
    to: validContacts,
    categories: [EmailCategory.ReportUpdate],
    subject: 'Vertragsabschlüsse vollständig',
    text: `Liebes FDPG Team,\n\nes wurde ein Bericht zum Antrag "${proposal.projectAbbreviation}" geändert. Bitte prüfen Sie den Bericht mit dem Titel "${report.title}" auf der Antragsseite des Forschungsdatenportals.\n\n ${proposalUrl}`,
  };
};

export const getReportDeleteEmailForFdpgMember = (
  validContacts: string[],
  proposal: Proposal,
  report: ReportDto,
  proposalUrl: string,
): IEmail => {
  return {
    to: validContacts,
    categories: [EmailCategory.ReportDelete],
    subject: 'Vertragsabschlüsse vollständig',
    text: `Liebes FDPG Team,\n\nes wurde ein Bericht mit dem Titel "${report.title}" im Antrag "${proposal.projectAbbreviation}" gelöscht. Bitte prüfen Sie den Antrag auf der Antragsseite des Forschungsdatenportals.\n\n ${proposalUrl}`,
  };
};
