import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { IEmail } from 'src/modules/email/types/email.interface';
import { PublicationCreateDto, PublicationUpdateDto } from 'src/modules/proposal/dto/proposal/publication.dto';
import { Proposal } from 'src/modules/proposal/schema/proposal.schema';
import { Publication } from 'src/modules/proposal/schema/sub-schema/publication.schema';

export const getPublicationCreateEmailForFdpgMember = (
  validContacts: string[],
  proposal: Proposal,
  publication: PublicationCreateDto,
  proposalUrl: string,
): IEmail => {
  return {
    to: validContacts,
    categories: [EmailCategory.PublicationCreate],
    subject: 'Bericht hinzugefügt',
    text: `Liebes FDPG Team,\n\nes wurde eine neue Publikation zum Antrag "${proposal.projectAbbreviation}" hinzugefügt. Bitte prüfen Sie die Publikation mit dem Titel "${publication.title}" auf der Antragsseite des Forschungsdatenportals.\n\n ${proposalUrl}`,
  };
};

export const getPublicationUpdateEmailForFdpgMember = (
  validContacts: string[],
  proposal: Proposal,
  publication: PublicationUpdateDto,
  proposalUrl: string,
): IEmail => {
  return {
    to: validContacts,
    categories: [EmailCategory.PublicationUpdate],
    subject: 'Vertragsabschlüsse vollständig',
    text: `Liebes FDPG Team,\n\nes wurde eine Publikation zum Antrag "${proposal.projectAbbreviation}" geändert. Bitte prüfen Sie die Publikation mit dem Titel "${publication.title}" auf der Antragsseite des Forschungsdatenportals.\n\n ${proposalUrl}`,
  };
};

export const getPublicationDeleteEmailForFdpgMember = (
  validContacts: string[],
  proposal: Proposal,
  publication: Publication,
  proposalUrl: string,
): IEmail => {
  return {
    to: validContacts,
    categories: [EmailCategory.PublicationDelete],
    subject: 'Vertragsabschlüsse vollständig',
    text: `Liebes FDPG Team,\n\nes wurde eine Publikation mit dem Titel "${publication.title}" im Antrag "${proposal.projectAbbreviation}" gelöscht. Bitte prüfen Sie den Antrag auf der Antragsseite des Forschungsdatenportals.\n\n ${proposalUrl}`,
  };
};
