import { ProposalStatus } from '../enums/proposal-status.enum';
import { ConditionalApproval } from '../schema/sub-schema/conditional-approval.schema';
import { FdpgTask } from '../schema/sub-schema/fdpg-task.schema';
import { RequestedData } from '../schema/sub-schema/requested-data.schema';
import { UserProject } from '../schema/sub-schema/user-project.schema';
import { RegisterInfo } from '../schema/sub-schema/register-info.schema';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { ProposalType } from '../enums/proposal-type.enum';
import { DueDateEnum } from '../enums/due-date.enum';
export interface IProposalGetListSchema {
  type: ProposalType;
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
  deadlines?: Record<DueDateEnum, Date | null>;
  registerInfo?: Partial<RegisterInfo>;
  registerFormId?: string;
  numberOfRequestedLocations?: number;
  numberOfApprovedLocations?: number;
  openDizChecks: string[];
  dizApprovedLocations: string[];
  openDizConditionChecks: string[];
  uacApprovedLocations: string[];
  signedContracts: string[];
  requestedButExcludedLocations: string[];
  requestedData: Pick<RequestedData, 'desiredDataAmount'>;
  totalPromisedDataAmount?: number;
  totalContractedDataAmount?: number;
  locationConditionDraft: ConditionalApproval[];
  conditionalApprovals: ConditionalApproval[];
  contractAcceptedByResearcher: boolean;
  contractRejectedByResearcher: boolean;
  selectedDataSources: PlatformIdentifier[];

  openFdpgTasks: FdpgTask[];

  _id: string;
}
