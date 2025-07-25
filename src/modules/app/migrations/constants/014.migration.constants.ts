import { ConfigType } from 'src/modules/admin/enums/config-type.enum';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { DataPrivacyConfig } from 'src/modules/admin/schema/data-privacy/data-privacy-config.schema';
import { ProposalTypeOfUse } from 'src/modules/proposal/enums/proposal-type-of-use.enum';

export const DataPrivacySeedDife = {
  platform: PlatformIdentifier.DIFE,
  type: ConfigType.DataPrivacy,
  messages: {
    all: {
      headline: 'proposal.DifeDataPrivacyTitle',
      text: 'proposal.DifeDataPrivacyText',
    },
  },
} as DataPrivacyConfig;

export const dataPrivacySeedMii = {
  platform: PlatformIdentifier.Mii,
  type: ConfigType.DataPrivacy,
  messages: {
    [ProposalTypeOfUse.Biosample]: {
      headline: 'proposal.MiiDataPrivacyTitle_Biosample',
      text: 'proposal.MiiDataPrivacyText_Biosample',
    },
    [ProposalTypeOfUse.Centralized]: {
      headline: 'proposal.MiiDataPrivacyTitle_Centralized',
      text: 'proposal.MiiDataPrivacyText_Centralized',
    },
    [ProposalTypeOfUse.Distributed]: {
      headline: 'proposal.MiiDataPrivacyTitle_Distributed',
      text: 'proposal.MiiDataPrivacyText_Distributed',
    },
  },
} as DataPrivacyConfig;
