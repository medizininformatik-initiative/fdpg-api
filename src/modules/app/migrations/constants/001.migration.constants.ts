import { ConfigType } from 'src/modules/admin/enums/config-type.enum';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';

export const termsAndConditionsSeedMii = {
  platform: PlatformIdentifier.Mii,
  type: ConfigType.TermsDialog,
  messages: {
    en: {
      checkboxLabel1:
        'I agree that the provided information about participating scientists, project details and general project information will be published in {pubLoc}. I have made sure that the person responsible for the project agrees to the publication of his/her name in the register.',
      checkboxLabel1_pubLoc: 'the MII project register',
      checkboxLabel2: 'I take note of the {contract} and the associated {terms}.',
      checkboxLabel2_contract: 'contract template',
      checkboxLabel2_terms: 'General Terms and Conditions of Use and Contract',
    },
    de: {
      checkboxLabel1:
        'Ich bin damit einverstanden, dass die im Antrag angegebenen beteiligten Personen, sowie die Projektdetails und allgemeinen Projektangaben im {pubLoc} veröffentlicht werden. Ich habe mich vergewissert, dass die projektverantwortliche Person mit der Veröffentlichung ihres Namens im Register einverstanden ist.',
      checkboxLabel1_pubLoc: 'Projektregister der MII',
      checkboxLabel2: 'Ich nehme die {contract} und die zugehörigen {terms} zur Kenntnis.',
      checkboxLabel2_contract: 'Nutzungsvertragsvorlage',
      checkboxLabel2_terms: 'Allgemeinen Nutzungs- und Vertragsbedingungen',
    },
  },
  terms: [
    {
      slots: [
        {
          link: 'https://forschen-fuer-gesundheit.de',
          label: 'checkboxLabel1_pubLoc',
          name: 'pubLoc',
        },
      ],
      label: 'checkboxLabel1',
    },
    {
      slots: [
        {
          link: 'https://forschen-fuer-gesundheit.de/nutzungsbedingungen.php',
          label: 'checkboxLabel2_contract',
          name: 'contract',
        },
        {
          link: 'https://forschen-fuer-gesundheit.de/nutzungsbedingungen.php',
          label: 'checkboxLabel2_terms',
          name: 'terms',
        },
      ],
      label: 'checkboxLabel2',
    },
  ],
};
