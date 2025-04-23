import { MiiLocation } from 'src/shared/constants/mii-locations';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { ConditionalApproval } from '../schema/sub-schema/conditional-approval.schema';
import { FdpgTask } from '../schema/sub-schema/fdpg-task.schema';
import { RequestedData } from '../schema/sub-schema/requested-data.schema';
import { UserProject } from '../schema/sub-schema/user-project.schema';
import { SelectedDataSource } from '../schema/sub-schema/selected-data-source.schema';
export interface IProposalGetListSchema {
  userProject: Partial<UserProject>;
  projectAbbreviation: string;
  ownerName: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  status: ProposalStatus;
  isLocked: boolean;
  submittedAt?: Date;
  dueDateForStatus?: Date;

  numberOfRequestedLocations?: number;
  numberOfApprovedLocations?: number;
  openDizChecks: MiiLocation[];
  dizApprovedLocations: MiiLocation[];
  openDizConditionChecks: MiiLocation[];
  uacApprovedLocations: MiiLocation[];
  signedContracts: MiiLocation[];
  requestedButExcludedLocations: MiiLocation[];
  requestedData: Pick<RequestedData, 'desiredDataAmount'>;
  totalPromisedDataAmount?: number;
  totalContractedDataAmount?: number;
  locationConditionDraft: ConditionalApproval[];
  conditionalApprovals: ConditionalApproval[];
  contractAcceptedByResearcher: boolean;
  contractRejectedByResearcher: boolean;
  selectedDataSources: SelectedDataSource[];

  openFdpgTasks: FdpgTask[];

  _id: string;
}
