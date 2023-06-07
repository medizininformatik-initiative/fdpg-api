import { ConfigType } from 'src/modules/admin/enums/config-type.enum';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { DataPrivacyConfig } from 'src/modules/admin/schema/data-privacy/data-privacy-config.schema';
import { ProposalTypeOfUse } from 'src/modules/proposal/enums/proposal-type-of-use.enum';

export const dataPrivacySeedMii = {
  platform: PlatformIdentifier.Mii,
  type: ConfigType.DataPrivacy,
  messages: {
    [ProposalTypeOfUse.Biosample]: {
      headline: {
        en: 'Legal basis for central analyses (data for biosamples)',
        de: 'Rechtsgrundlagen für zentrale Analysen (Daten zu Bioproben)',
      },
      text: {
        en: 'The requested use case is a central analysis (data sharing) in which personal health data leave the sites. Usually, implementation is possible on the basis of an informed consent (broad consent). The legal basis is explained in the overarching data protection concept of the MII in section 3.2.3.',
        de: 'Beim vorliegenden Anwendungsfall handelt es sich um eine zentrale Analyse (Data Sharing, Daten-Herausgeben), bei der personenbezogene Gesundheitsdaten die Standorte verlassen. Eine Durchführung ist in der Regel auf Basis einer informierten Einwilligung (des Broad Consent) möglich. Die Rechtsgrundlage wird im übergreifenden Datenschutzkonzept der MII in Abschnitt 3.2.3 erläutert.',
      },
    },
    [ProposalTypeOfUse.Centralized]: {
      headline: {
        en: 'Legal basis for central analyses',
        de: 'Rechtsgrundlagen für zentrale Analysen',
      },
      text: {
        en: 'The requested use case is a central analysis (data sharing) in which personal health data leave the sites. Usually, implementation is possible on the basis of an informed consent (broad consent). The legal basis is explained in the overarching data protection concept of the MII in section 3.2.3.',
        de: 'Beim vorliegenden Anwendungsfall handelt es sich um eine zentrale Analyse (Data Sharing, Daten-Herausgeben), bei der personenbezogene Gesundheitsdaten die Standorte verlassen. Eine Durchführung ist in der Regel auf Basis einer informierten Einwilligung (des Broad Consent) möglich. Die Rechtsgrundlage wird im übergreifenden Datenschutzkonzept der MII in Abschnitt 3.2.3 erläutert.',
      },
    },
    [ProposalTypeOfUse.Distributed]: {
      headline: {
        en: 'Legal basis for distributed analyses',
        de: 'Rechtsgrundlagen für Verteilte Analysen',
      },
      text: {
        en: 'The requested use case is a distributed analysis where no personal health data leave the sites. According to section 3.2.2 of the overarching data protection concept of the MII, no further legal basis is necessary for local processing. Nevertheless, it is known that the view on this can vary by federal state and location. The section therefore refers to other options such as state hospital or local data protection laws or, if not otherwise possible, Broad Consent. The local data protection officers of the sites are able to provide information as to whether another legal basis is used at all and, if so, which one.',
        de: 'Beim vorliegenden Anwendungsfall handelt es sich um eine verteilte Analyse, bei der keine personenbezogenen Gesundheitsdaten die Standorte verlassen. Gemäß Abschnitt 3.2.2 des übergreifenden Datenschutzkonzepts der MII ist für die lokale Verarbeitung keine weitere Rechtsgrundlage notwendig. Dennoch ist bekannt, dass die Auffassung hierzu nach Bundesland und Standort variieren kann. In dem Abschnitt wird daher auf weitere Möglichkeiten wie Landeskrankenhaus- oder Landesdatenschutzgesetze oder, falls nicht anders möglich, auf den Broad Consent verwiesen. Die lokalen Datenschutzbeauftragten der Standorte sind für den jeweiligen Standort auskunftsfähig, ob überhaupt und wenn ja welche weitere Rechtsgrundlage zum Einsatz kommt.',
      },
    },
  },
} as DataPrivacyConfig;
