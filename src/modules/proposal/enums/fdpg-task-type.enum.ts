export enum FdpgTaskType {
  // Multiple tasks of this type are possible to be open for one proposal:
  Comment = 'COMMENT',
  ConditionApproval = 'CONDITION_APPROVAL',

  // Only once:
  UacApprovalComplete = 'UAC_APPROVAL_COMPLETE',
  DataAmountReached = 'DATA_AMOUNT_REACHED',
  ContractComplete = 'CONTRACT_COMPLETE',
  DueDateReached = 'DUE_DATE_REACHED',
}
