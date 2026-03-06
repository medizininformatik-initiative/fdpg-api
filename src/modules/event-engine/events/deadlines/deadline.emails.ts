import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { EmailParameterMap } from 'src/modules/email/types/template-email-param-keys.types';
import { DueDateEnum } from 'src/modules/proposal/enums/due-date.enum';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { ProposalWithoutContent } from '../../types/proposal-without-content.type';
import { ITemplateEmail } from 'src/modules/email/types/email.interface';
import { getLocaleDateString } from 'src/shared/utils/date.utils';

export const getDeadlineEmailContent = (deadlineType: DueDateEnum, date: Date | null): EmailParameterMap => {
  switch (deadlineType) {
    case DueDateEnum.DUE_DAYS_FDPG_CHECK:
      return {};
    case DueDateEnum.DUE_DAYS_LOCATION_CHECK:
      return {
        conditionDeadlineLocationCheckChanged: true,
        deadlineLocationCheckNewDate: date,
      };
    case DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING:
      return { conditionDeadlineLocationContractingChanged: true, deadlineLocationContractingNewDate: date };
    case DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY:
      return {
        conditionDeadlineExpectedDataDeliveryChanged: true,
        deadlineExpectedDataDeliveryNewDate: date,
      };
    case DueDateEnum.DUE_DAYS_DATA_CORRUPT:
      return {};
    case DueDateEnum.DUE_DAYS_FINISHED_PROJECT:
      return {
        conditionDeadlineFinishedProjectChanged: true,
        deadlineFinishedProjectNewDate: date,
      };

    default:
      return {};
  }
};

const DEADLINE_REMOVED = '( Frist wurde entfernt )';

const getDateOrDefault = (deadlineDate?: Date | string): string =>
  deadlineDate ? getLocaleDateString(deadlineDate) : DEADLINE_REMOVED;

export const deadlineEmail = (
  validContacts: string[],
  proposal: Proposal | ProposalWithoutContent,
  categories: EmailCategory[],
  projectLink: string,
  emailParameterMap: EmailParameterMap,
): ITemplateEmail => {
  return {
    to: validContacts,
    categories,
    templateId: 63,
    params: {
      projectAbbreviation: proposal.projectAbbreviation,
      projectLink: projectLink,

      conditionDeadlineFdpgCheckChanged: !!emailParameterMap['conditionDeadlineFdpgCheckChanged'],
      deadlineFdpgCheckNewDate: getDateOrDefault(emailParameterMap['deadlineFdpgCheckNewDate'] as Date),

      conditionDeadlineLocationCheckChanged: !!emailParameterMap['conditionDeadlineLocationCheckChanged'],
      deadlineLocationCheckNewDate: getDateOrDefault(emailParameterMap['deadlineLocationCheckNewDate'] as Date),

      conditionDeadlineLocationContractingChanged: !!emailParameterMap['conditionDeadlineLocationContractingChanged'],
      deadlineLocationContractingNewDate: getDateOrDefault(
        emailParameterMap['deadlineLocationContractingNewDate'] as Date,
      ),

      conditionDeadlineExpectedDataDeliveryChanged: !!emailParameterMap['conditionDeadlineExpectedDataDeliveryChanged'],
      deadlineExpectedDataDeliveryNewDate: getDateOrDefault(
        emailParameterMap['deadlineExpectedDataDeliveryNewDate'] as Date,
      ),

      conditionDeadlineExpectedDataCorruptChanged: !!emailParameterMap['conditionDeadlineExpectedDataCorruptChanged'],
      deadlineExpectedDataCorruptNewDate: getDateOrDefault(
        emailParameterMap['deadlineExpectedDataCorruptNewDate'] as Date,
      ),

      conditionDeadlineFinishedProjectChanged: !!emailParameterMap['conditionDeadlineFinishedProjectChanged'],
      deadlineFinishedProjectNewDate: getDateOrDefault(emailParameterMap['deadlineFinishedProjectNewDate'] as Date),
    },
  };
};
