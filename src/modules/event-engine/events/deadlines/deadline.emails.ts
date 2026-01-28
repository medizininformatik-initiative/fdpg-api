import { DueDateEnum } from 'src/modules/proposal/enums/due-date.enum';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';

export const fdpgDeadlineEmailHeader = 'Liebes FDPG Team,\n\n';
export const dizDeadlineEmailHeader = 'Liebe DIZ-Mitarbeiterin, lieber DIZ-Mitarbeiter,\n\n';
export const uacDeadlineEmailHeader = 'Liebes Use & Access Comittee,\n\n';
export const researcherDeadlineEmailHeader = 'Liebe Antragstellerin, lieber Antragsteller,\n\n';

export const defaultDeadlineEmailBody = (proposal: Proposal) =>
  `Es ergeben sich neue Fristen für das Projekt '${proposal.projectAbbreviation}':\n\n`;

export const defaultDeadlineEmailFooter = (proposalUrl: string) =>
  `Die Einreichung ist erreichbar unter: ${proposalUrl}`;

export const getDeadlineEmailContent = (deadlineType: DueDateEnum, date: Date | null): string => {
  switch (deadlineType) {
    case DueDateEnum.DUE_DAYS_FDPG_CHECK:
      return `\t- FDPG-Check: ${date ? date.toLocaleDateString('de') : '(Frist wurde entfernt)'}\n\n`;
    case DueDateEnum.DUE_DAYS_LOCATION_CHECK:
      return `\t- Location Check: ${date ? date.toLocaleDateString('de') : '(Frist wurde entfernt)'}\n\n`;
    case DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING:
      return `\t- Standort Vertragsunterzeichnung: ${date ? date.toLocaleDateString('de') : '(Frist wurde entfernt)'}\n\n`;
    case DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY:
      return `\t- Datenauslieferung: ${date ? date.toLocaleDateString('de') : '(Frist wurde entfernt)'}\n\n`;
    case DueDateEnum.DUE_DAYS_DATA_CORRUPT:
      return `\t- Erneute Datenauslieferung: ${date ? date.toLocaleDateString('de') : '(Frist wurde entfernt)'}\n\n`;
    case DueDateEnum.DUE_DAYS_FINISHED_PROJECT:
      return `\t- Projektabschluss: ${date ? date.toLocaleDateString('de') : '(Frist wurde entfernt)'}\n\n`;

    default:
      return '';
  }
};
