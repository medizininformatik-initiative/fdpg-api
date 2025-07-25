/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { ConfigType } from 'src/modules/admin/enums/config-type.enum';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { DataPrivacyConfig } from 'src/modules/admin/schema/data-privacy/data-privacy-config.schema';

export const DataPrivacySeedDife = {
  platform: PlatformIdentifier.DIFE,
  type: ConfigType.DataPrivacy,
  messages: {
    all: {
      headline: {
        en: 'Results are to be generated via distributed computing',
        de: 'Es sollen Ergebnisse über verteiltes Rechnen erzeugt werden',
      },
      text: {
        en: `Data protection in this project is implemented in accordance with the specifications of the MII's Comprehensive Data Protection Concept in version 1.0. This project involves a distributed analysis in which no personal health data leaves the sites. According to Section 3.2.2 of the Comprehensive Data Protection Concept, no further legal basis is required for local processing. However, it is recognized that the understanding in this regard can vary depending on the federal state and location. This section therefore refers to other options such as state hospital or state data protection laws or, if no other option is available, to broad consent. The local data protection officers at the sites are able to provide information for their respective locations as to whether any legal basis is used and, if so, which legal basis. Pseudonymized data is to be centrally consolidated. Data protection in this project is implemented in accordance with the specifications of the MII's Comprehensive Data Protection Concept in version 1.0. The proposed use case involves centralized analysis (data sharing, data disclosure) in which personal health data leaves the sites. This can generally be carried out on the basis of informed consent (broad consent). The legal basis is explained in the data protection concept in Section 3.2.3.`,
        de: `Der Datenschutz wird im vorliegenden Projekt gemäß den Vorgaben im Übergreifenden Datenschutzkonzept der MII in Version 1.0 umgesetzt. Beim vorliegenden Projekt handelt es sich um eine verteilte Analyse, bei der keine personenbezogenen Gesundheitsdaten die Standorte verlassen. Gemäß Abschnitt 3.2.2 des übergreifenden Datenschutzkonzepts ist für die lokale Verarbeitung keine weitere Rechtsgrundlage notwendig. Dennoch ist bekannt, dass die Auffassung hierzu nach Bundesland und Standort variieren kann. In dem Abschnitt wird daher auf weitere Möglichkeiten wie Landeskrankenhaus- oder Landesdatenschutzgesetze oder, falls nicht anders möglich, auf den Broad Consent verwiesen. Die lokalen Datenschutzbeauftragten der Standorte sind für ihren jeweiligen Standort auskunftsfähig, ob überhaupt und wenn ja welche Rechtsgrundlage zum Einsatz kommt. Es sollen pseudonymisierte Daten zentral zusammengeführt werden Der Datenschutz wird im vorliegenden Projekt gemäß den Vorgaben im Übergreifenden Datenschutzkonzept der MII in Version 1.0 umgesetzt. Beim vorliegenden, beantragten Anwendungsfall handelt es sich um eine zentrale Analyse (Data Sharing, Daten-Herausgeben), bei der personenbezogene Gesundheitsdaten die Standorte verlassen. Eine Durchführung ist in der Regel auf Basis einer informierten Einwilligung (des Broad Consent) möglich. Die Rechtsgrundlage wird im Datenschutzkonzept in Abschnitt 3.2.3 erläutert.`,
      },
    },
  },
} as DataPrivacyConfig;
