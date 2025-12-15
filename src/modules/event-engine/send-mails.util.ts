import { EmailService } from '../email/email.service';
import { dizEmail, fdpgEmail, researcherEmail, uacEmail } from '../email/proposal.emails';
import { EmailCategory } from '../email/types/email-category.enum';
import { EmailRoleTargets } from '../email/types/email-role-targets.enum';
import { TemplateProposalEmailConditionKeys } from '../email/types/template-email-param-keys.types';
import { Proposal } from '../proposal/schema/proposal.schema';
import { KeycloakUtilService } from '../user/keycloak-util.service';

export const sendMailsUtil = async (
  proposal: Proposal,
  proposalUrl: string,
  targets: EmailRoleTargets[] = [],
  locations: string[] = [],
  emailParameterMap: Partial<Record<TemplateProposalEmailConditionKeys, boolean>> = {},
  emailService: EmailService,
  keycloakUtilService: KeycloakUtilService,
  categories: EmailCategory[],
) => {
  const ownerTask = async () => {
    if (!targets.includes(EmailRoleTargets.RESEARCHER)) {
      return Promise.resolve();
    }
    const validOwnerContacts = await keycloakUtilService.getValidContactsByUserIds([proposal.owner.id]);
    const mail = researcherEmail(validOwnerContacts, proposal, categories, proposalUrl, emailParameterMap);

    return await emailService.send(mail);
  };

  const fdpgTask = async () => {
    if (!targets.includes(EmailRoleTargets.FDPG)) {
      return Promise.resolve();
    }
    const validFdpgContacts = await keycloakUtilService
      .getFdpgMemberLevelContacts(proposal)
      .then((members) => members.map((member) => member.email));
    const mail = fdpgEmail(validFdpgContacts, proposal, categories, proposalUrl, emailParameterMap);
    return await emailService.send(mail);
  };

  const dizTask = async () => {
    if (!targets.includes(EmailRoleTargets.DIZ) || locations.length < 1) {
      return Promise.resolve();
    }

    const validDizContacts = await keycloakUtilService
      .getDizMembers()
      .then((members) => keycloakUtilService.getLocationContacts(locations, members));

    const mail = dizEmail(validDizContacts, proposal, categories, proposalUrl, emailParameterMap);
    return await emailService.send(mail);
  };

  const uacTask = async () => {
    if (!targets.includes(EmailRoleTargets.UAC) || locations.length < 1) {
      return Promise.resolve();
    }

    const validUacContacts = await keycloakUtilService
      .getDizMembers()
      .then((members) => keycloakUtilService.getLocationContacts(locations, members));

    const mail = uacEmail(validUacContacts, proposal, categories, proposalUrl, emailParameterMap);
    return await emailService.send(mail);
  };

  const emailTasks = [ownerTask(), fdpgTask(), dizTask(), uacTask()];

  await Promise.allSettled(emailTasks);
};
