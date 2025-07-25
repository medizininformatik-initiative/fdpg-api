export enum BadRequestError {
  ProjectAbbreviationMustBeUnique = '400-001',
  IdMismatchBetweenParamAndBody = '400-002',
  CommentOneCanNotAnswerSelf = '400-003',
  KeycloakInvalidClientId = '400-004',
  KeycloakInvalidRedirectUri = '400-005',
  KeycloakInvalidLocationForRole = '400-006',
  KeycloakUserNotFound = '400-007',
  ContractSignNoContract = '400-008',
  UploadMimetypeNotSupported = '400-009',
  ProposalStatusNotSwitchable = '400-010',
  DeclineReason = '400-011',
  ReportsMaxUploadCount = '400-012',
  LocationNotAssignedToContract = '400-013',
  LocationRevertValidation = '400-014',
  MaximumCohortSizeReached = '400-015',
  FeasibilityError = '400-016',
  NotInContractingStatus = '400-017',
}
