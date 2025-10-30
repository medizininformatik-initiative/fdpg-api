export type TemplateProposalEmailConditionKeys =
  | 'conditionProposalRejected'
  | 'conditionProposalRework'
  | 'conditionProposalFdpgCheck'
  | 'conditionProposalLocationCheck'
  | 'conditionProposalLocalUacCheck'
  | 'conditionProposalUacCheck'
  | 'conditionProposalLocationCheckDizForward'
  | 'conditionProposalUacReminder'
  | 'conditionProposalContracting'
  | 'conditionProposalContractSignedLocations'
  | 'conditionProposalContractSignedUser'
  | 'conditionProposalDataDelivery'
  | 'conditionProposalDataResearch'
  | 'conditionProposalDataReady'
  | 'conditionProposalDataReturn'
  | 'conditionProposalReport'
  | 'conditionProposalPublication'
  | 'conditionProposalRegistration'
  | 'conditionProposalFinished'
  | 'conditionProposalConcluded'
  | 'conditionProposalArchived';

export type TemplateEmailParamKeys =
  | Partial<TemplateProposalEmailConditionKeys>
  | 'projectAbbreviation'
  | 'timestamp'
  | 'projectLink'
  | 'projectResearchers'
  | 'firstName'
  | 'lastName';
