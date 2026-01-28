export enum DirectUpload {
  GeneralAppendix = 'GENERAL_APPENDIX',
  EthicVote = 'ETHIC_VOTE',
  EthicVoteDeclarationOfNonResponsibility = 'ETHIC_VOTE_DECLARATION_OF_NON_RESPONSIBILITY',
  AdditionalDocument = 'ADDITIONAL_DOCUMENT',
  ContractAppendix = 'CONTRACT_APPENDIX',
}

export enum UseCaseUpload {
  ContractCondition = 'CONTRACT_CONDITION',
  ContractDraft = 'CONTRACT_DRAFT',
  LocationContract = 'LOCATION_CONTRACT',
  ResearcherContract = 'RESEARCHER_CONTRACT',
  FeasibilityQuery = 'FEASIBILITY_QUERY',
  ProposalPDF = 'PROPOSAL_PDF',
  ReportUpload = 'REPORT_UPLOAD',
}

export type UploadType = DirectUpload | UseCaseUpload;
