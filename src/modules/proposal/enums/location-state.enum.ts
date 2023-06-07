export enum LocationState {
  IsDizCheck = 'DIZ_CHECK',
  DizApproved = 'DIZ_APPROVED',
  UacApproved = 'UAC_APPROVED',
  SignedContract = 'SIGNED_CONTRACT',
  SignedContractAndContractingDone = 'SIGNED_CONTRACT_AND_CONTRACTING_DONE',
  RequestedButExcluded = 'REQUESTED_BUT_EXCLUDED',
  NotRequested = 'NOT_REQUESTED',
  ConditionalApprovalDeclined = 'CONDITIONAL_APPROVAL_DECLINED',
  ResearcherRejectedContract = 'RESEARCHER_REJECTED_CONTRACT',
  ResearcherAcceptedContract = 'RESEARCHER_ACCEPTED_CONTRACT',
  ConditionalApprovalAccepted = 'CONDITIONAL_APPROVAL_ACCEPTED',
  ConditionalApprovalPending = 'CONDITIONAL_APPROVAL_PENDING',
}
