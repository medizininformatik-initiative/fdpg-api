import { ClassTransformOptions, Exclude, Expose, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  Matches,
  MaxLength,
  ValidateNested,
  IsString,
  ValidateIf,
} from 'class-validator';
import { PROPOSAL_SHORTCUT_REGEX } from 'src/shared/constants/regex.constants';
import { ExposeId } from 'src/shared/decorators/transform/expose-id.decorator';
import { OwnerDto } from 'src/shared/dto/owner.dto';
import { VersionDto } from 'src/shared/dto/version.dto';
import { BadRequestError } from 'src/shared/enums/bad-request-error.enum';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { IsValidId } from 'src/shared/validators/is-valid-id.validator';
import { ExposeHistory } from '../../decorators/expose-history.decorator';
import { ExposeLocationStatus } from '../../decorators/expose-location-status.decorator';
import { ExposeUpload } from '../../decorators/expose-uploads.decorator';
import { LocationState } from '../../enums/location-state.enum';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalType } from '../../enums/proposal-type.enum';
import { IProposalGetListSchema } from '../../types/proposal-get-list-schema.interface';
import { getIsDoneOverview } from '../../utils/is-done-overview.util';
import { getMostAdvancedState } from '../../utils/validate-access.util';
import { IsUniqueAbbreviation } from '../../validators/is-unique-abbreviation.validator';
import { IsDoneOverviewGetDto } from '../is-done-overview';
import { UploadGetDto } from '../upload.dto';
import { ApplicantDto } from './applicant.dto';
import { ConditionalApprovalGetDto } from './conditional-approval.dto';
import { DeclineReasonDto } from './decline-reason.dto';
import { FdpgChecklistGetDto, initChecklist } from './fdpg-checklist.dto';
import { FdpgTaskGetDto } from './fdpg-task.dto';
import { HistoryEventGetDto } from './history-event.dto';
import { RegisterInfoDto } from './register-info.dto';
import { ParticipantDto } from './participant.dto';
import { ProjectResponsibleDto } from './project-responsible.dto';
import { ProjectUserDto } from './project-user.dto';
import { PublicationGetDto } from './publication.dto';
import { RequestedDataDto } from './requested-data.dto';
import { UacApprovalGetDto } from './uac-approval.dto';
import { UserProjectDto } from './user-project.dto';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { OutputGroup } from 'src/shared/enums/output-group.enum';
import { AdditionalLocationInformationGetDto } from './additional-location-information.dto';
import { DizDetailsGetDto } from './diz-details.dto';
import { SetDeadlinesDto } from '../set-deadlines.dto';
import { defaultDueDateValues } from '../../enums/due-date.enum';
import { ExposeForDataSources } from 'src/shared/decorators/data-source.decorator';
import { DataDeliveryGetDto } from './data-delivery/data-delivery.dto';
import { ProjectAssigneeDto } from './project-assignee.dto';

const getRoleFromTransform = (options: ClassTransformOptions) => {
  const [role] = options.groups
    .filter((entry) => entry.startsWith('GROUP_USER_ROLE_'))
    .map((roleStr) => roleStr.replace('GROUP_USER_ROLE_', ''));
  const [location] = options.groups
    .filter((entry) => entry.startsWith('GROUP_USER_LOCATION_'))
    .map((locationStr) => locationStr.replace('GROUP_USER_LOCATION_', ''));

  return { role, location };
};

const getSignedTransform = (proposal: ProposalGetDto) => {
  const conditionAccepted =
    (proposal.conditionalApprovals || []).filter(
      (condition) => condition.isAccepted && !proposal.requestedButExcludedLocations.includes(condition.location),
    ) ?? [];
  const uacApprovals =
    (proposal.uacApprovals || []).filter(
      (approval) => !proposal.requestedButExcludedLocations.includes(approval.location),
    ) ?? [];

  const allItems = [...uacApprovals, ...conditionAccepted];
  return [...new Map(allItems.map((item) => [item.location, item])).values()];
};

@Exclude()
export class ProposalBaseDto {
  @Expose()
  @IsNotEmptyString()
  @MaxLength(25)
  @Matches(PROPOSAL_SHORTCUT_REGEX)
  @IsUniqueAbbreviation({ context: [BadRequestError.ProjectAbbreviationMustBeUnique] })
  projectAbbreviation: string;

  @Expose()
  @IsArray()
  @ValidateNested()
  @Type(() => ParticipantDto)
  participants: ParticipantDto[];

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => ApplicantDto)
  applicant: ApplicantDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => ProjectResponsibleDto)
  projectResponsible: ProjectResponsibleDto;

  @Expose()
  @ValidateNested()
  @Type(() => ProjectUserDto)
  projectUser: ProjectUserDto;

  @Expose()
  @IsObject()
  @ValidateNested()
  @Type(() => UserProjectDto)
  userProject: UserProjectDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => RequestedDataDto)
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  requestedData: RequestedDataDto;

  @Expose()
  @IsEnum(ProposalStatus)
  status: ProposalStatus;

  @Expose()
  @IsEnum(ProposalType)
  @IsOptional()
  type: ProposalType;

  @Expose()
  @IsEnum(PlatformIdentifier)
  @IsOptional()
  platform: PlatformIdentifier;

  @Expose()
  @IsArray()
  @IsEnum(PlatformIdentifier, { each: true })
  selectedDataSources: PlatformIdentifier[];

  @Expose()
  @IsString()
  @IsOptional()
  dataSourceLocaleId: string;

  @Expose()
  @Type(() => RegisterInfoDto)
  @IsOptional()
  registerInfo?: RegisterInfoDto;

  @Expose()
  @IsString()
  @IsOptional()
  registerFormId?: string;
}

export class ProposalCreateDto extends ProposalBaseDto {}

export class ProposalUpdateDto extends ProposalBaseDto {
  @ExposeId()
  @IsValidId()
  _id: string;
}

export class ProposalGetDto extends ProposalBaseDto {
  @Expose()
  isLocked: boolean;

  @Expose()
  formVersion: number;

  @ExposeUpload()
  uploads: UploadGetDto[];

  @Expose()
  @Type(() => PublicationGetDto)
  publications: PublicationGetDto[];

  @ExposeHistory()
  history: HistoryEventGetDto[];

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember] })
  @Transform((params) => initChecklist(params.obj[params.key]))
  fdpgChecklist: FdpgChecklistGetDto;

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember] })
  @Transform((params) => getIsDoneOverview(params.obj))
  isDoneOverview?: IsDoneOverviewGetDto;

  @Expose()
  @Type(() => OwnerDto)
  owner: OwnerDto;

  @Expose()
  @IsNotEmptyString()
  ownerId: string;

  @Expose()
  ownerName: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  submittedAt: Date;

  @Expose()
  statusChangeToLocationCheckAt: Date;

  @Expose()
  statusChangeToLocationContractingAt: Date;

  @Expose()
  dueDateForStatus?: Date;

  @Expose()
  @Type(() => VersionDto)
  version: VersionDto;

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember] })
  @Type(() => FdpgTaskGetDto)
  openFdpgTasks: FdpgTaskGetDto[];

  @Expose()
  numberOfRequestedLocations?: number;

  // UAC Approved locations after status change to CONTRACTING
  @Expose()
  numberOfApprovedLocations?: number;

  // Signed contracts after status change to EXPECT_DATA_DELIVERY
  @Expose()
  numberOfSignedLocations: number;

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.Researcher, Role.DizMember] })
  totalPromisedDataAmount?: number;

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.Researcher, Role.DizMember] })
  totalContractedDataAmount?: number;

  @Expose()
  contractAcceptedByResearcher: boolean;

  @Expose()
  contractRejectedByResearcher: boolean;

  @Expose()
  contractRejectedByResearcherReason: string;

  @Expose()
  isContractingComplete: boolean;

  @Expose()
  researcherSignedAt: Date;

  @ExposeId()
  _id: string;

  @ExposeLocationStatus({ groups: [Role.UacMember, Role.DizMember] })
  locationStatus?: LocationState;

  // LOCATION Tasks --->
  // The following arrays should be used as a flow.
  // One location should only be in one state at the same time
  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.Researcher, Role.DizMember, Role.UacMember] })
  @Transform(({ value, options }) => {
    const { role, location } = getRoleFromTransform(options);

    return value.filter((miiLoc: string) => {
      if (role === Role.DizMember || role === Role.UacMember) {
        return miiLoc === location;
      }

      return true;
    });
  })
  openDizChecks: string[];

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.Researcher, Role.DizMember, Role.UacMember] })
  @Transform(({ value, options }) => {
    const { role, location } = getRoleFromTransform(options);

    return value.filter((miiLoc: string) => {
      if (role === Role.DizMember || role === Role.UacMember) {
        return miiLoc === location;
      }

      return true;
    });
  })
  dizApprovedLocations: string[];

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.Researcher, Role.DizMember] })
  @Transform(({ value, options }) => {
    const { role, location } = getRoleFromTransform(options);

    return value.filter((miiLoc: string) => {
      if (role === Role.DizMember || role === Role.UacMember) {
        return miiLoc === location;
      }

      return true;
    });
  })
  openDizConditionChecks: string[];

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.DizMember, Role.UacMember] })
  @Transform(({ value, options }) => {
    const { role, location } = getRoleFromTransform(options);

    return value.filter((miiLoc: string) => {
      if (role === Role.DizMember || role === Role.UacMember) {
        return miiLoc === location;
      }

      return true;
    });
  })
  uacApprovedLocations: string[];

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.Researcher, Role.DizMember, Role.UacMember] })
  @Transform(
    ({ obj }) =>
      obj.uacApprovedLocations?.filter((location) => !obj.requestedButExcludedLocations.includes(location)).length ?? 0,
  )
  uacApprovedLocationsCount: number;

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.DizMember, Role.UacMember] })
  @Transform(({ value, options }) => {
    const { role, location } = getRoleFromTransform(options);

    return value.filter((miiLoc: string) => {
      if (role === Role.DizMember || role === Role.UacMember) {
        return miiLoc === location;
      }

      return true;
    });
  })
  requestedButExcludedLocations: string[];

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.Researcher, Role.DizMember, Role.UacMember] })
  @Transform(({ obj }) => obj.requestedButExcludedLocations?.length ?? 0)
  requestedButExcludedLocationsCount: number;

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.UacMember, Role.DizMember, Role.UacMember] })
  @Transform(({ value, options }) => {
    const { role, location } = getRoleFromTransform(options);

    return value.filter((miiLoc: string) => {
      if (role === Role.DizMember || role === Role.UacMember) {
        return miiLoc === location;
      }

      return true;
    });
  })
  signedContracts: string[];

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.Researcher, Role.DizMember, Role.UacMember] })
  @Transform(
    ({ obj }) =>
      getSignedTransform(obj).filter(
        (approval) => approval.isContractSigned === true && approval.signedAt !== undefined,
      ).length,
  )
  signedContractsCount: number;

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.Researcher] })
  @Transform(({ obj }) => getSignedTransform(obj).filter((approval) => !approval.signedAt).length)
  signedContractsPendingCount: number;

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.DizMember, Role.UacMember] })
  @Type(() => AdditionalLocationInformationGetDto)
  @Transform(({ value, options }) => {
    const { role, location } = getRoleFromTransform(options);

    return value.filter((additionalInformation: AdditionalLocationInformationGetDto) => {
      if (role === Role.DizMember || role === Role.UacMember) {
        return additionalInformation.location === location;
      }

      return true;
    });
  })
  additionalLocationInformation: AdditionalLocationInformationGetDto[];

  @Expose({ groups: [Role.DizMember, Role.UacMember] })
  @Type(() => DizDetailsGetDto)
  @Transform(({ value, options }) => {
    const { role, location } = getRoleFromTransform(options);

    return value.filter((dizDetail: DizDetailsGetDto) => {
      if (role === Role.DizMember || role === Role.UacMember) {
        return dizDetail.location === location;
      }

      return true;
    });
  })
  dizDetails: DizDetailsGetDto[];

  // LOCATION Tasks <----

  // Conditional and UAC approval are stored additionally to the "flow-arrays" and are persistent
  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.Researcher, Role.DizMember] })
  @Type(() => ConditionalApprovalGetDto)
  @Transform(({ value, options }) => {
    const { role, location } = getRoleFromTransform(options);

    return value.filter((approval: ConditionalApprovalGetDto) => {
      if (role === Role.DizMember) {
        return approval.location === location;
      }

      return true;
    });
  })
  locationConditionDraft: ConditionalApprovalGetDto[];

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.DizMember, Role.UacMember] })
  @Type(() => ConditionalApprovalGetDto)
  @Transform(({ value, options }) => {
    const { role, location } = getRoleFromTransform(options);

    return value.filter((approval: ConditionalApprovalGetDto) => {
      if (role === Role.DizMember || role === Role.UacMember) {
        return approval.location === location;
      }

      return true;
    });
  })
  conditionalApprovals: ConditionalApprovalGetDto[];

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.Researcher, Role.DizMember, Role.UacMember] })
  @Transform(
    ({ obj }) =>
      (obj as ProposalGetDto).conditionalApprovals?.filter(
        (condition) => !obj.requestedButExcludedLocations.includes(condition.location),
      ).length ?? 0,
  )
  conditionalApprovalsCount: ConditionalApprovalGetDto[];

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.DizMember, Role.UacMember] })
  @Type(() => UacApprovalGetDto)
  @Transform(({ value, options, obj }) => {
    const { role, location } = getRoleFromTransform(options);

    return value
      .filter((approval: UacApprovalGetDto) => {
        if (role === Role.DizMember || role === Role.UacMember) {
          return approval.location === location;
        }

        return true;
      })
      .filter(
        (approval: UacApprovalGetDto) =>
          !obj.conditionalApprovals.map(({ location }) => location).includes(approval.location),
      );
  })
  uacApprovals: UacApprovalGetDto[];

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.Researcher, Role.DizMember, Role.UacMember] })
  @Transform(
    ({ obj }) =>
      obj.uacApprovals
        ?.filter((approval) => !obj.requestedButExcludedLocations.includes(approval.location))
        .filter(
          (approval: UacApprovalGetDto) =>
            !obj.conditionalApprovals.map(({ location }) => location).includes(approval.location),
        ).length ?? 0,
  )
  uacApprovalsCount: number;

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.Researcher, Role.DizMember, Role.UacMember] })
  @Transform(({ value, options }) => {
    const { role, location } = getRoleFromTransform(options);

    return value.filter((declineReason: DeclineReasonDto) => {
      if (role === Role.DizMember || role === Role.UacMember) {
        return declineReason.location === location;
      }

      return true;
    });
  })
  @Type(() => DeclineReasonDto)
  declineReasons: DeclineReasonDto[];

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember, Role.DizMember, Role.UacMember, OutputGroup.PdfOutput] })
  fdpgCheckNotes?: string;

  @Expose({ groups: [Role.Researcher] })
  isParticipatingScientist: boolean;

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember] })
  @Type(() => SetDeadlinesDto)
  @Transform(({ obj }) => {
    if (!obj.deadlines || typeof obj.deadlines !== 'object') {
      return { ...defaultDueDateValues };
    }

    return obj.deadlines; // Ensure object is returned as-is
  })
  deadlines: SetDeadlinesDto;

  @Expose()
  @Type(() => DataDeliveryGetDto)
  @IsOptional()
  dataDelivery?: DataDeliveryGetDto | null;

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember] })
  @Type(() => ProjectAssigneeDto)
  @IsOptional()
  projectAssignee?: ProjectAssigneeDto;
}

export class ProposalGetListDto {
  constructor(dbProjection: IProposalGetListSchema, user: IRequestUser) {
    this.projectAbbreviation = dbProjection.projectAbbreviation;
    this.projectTitle = dbProjection.userProject.generalProjectInformation.projectTitle;
    this.ownerName = dbProjection.ownerName;
    this.ownerId = dbProjection.ownerId;
    this.createdAt = dbProjection.createdAt;
    this.updatedAt = dbProjection.updatedAt;
    this.status = dbProjection.status;
    this.isLocked = dbProjection.isLocked;
    this.submittedAt = dbProjection.submittedAt;
    this.dueDateForStatus = dbProjection.dueDateForStatus;
    this.requestedLocationsCount = dbProjection.numberOfRequestedLocations;
    this.approvedLocationsCount = dbProjection.numberOfApprovedLocations;
    this.contractAcceptedByResearcher = dbProjection.contractAcceptedByResearcher;
    this.contractRejectedByResearcher = dbProjection.contractRejectedByResearcher;
    this._id = dbProjection._id;
    this.selectedDataSources = dbProjection.selectedDataSources;
    this.type = dbProjection.type;
    this.registerInfo = dbProjection.registerInfo;
    this.registerFormId = dbProjection.registerFormId;

    if (user.singleKnownRole === Role.FdpgMember || user.singleKnownRole == Role.DataSourceMember) {
      this.openDizChecksCount = dbProjection.openDizChecks.length;
      this.dizApprovedCount = dbProjection.dizApprovedLocations.length;
      this.uacApprovedCount = dbProjection.uacApprovedLocations.length;
      this.signedContractsCount = dbProjection.signedContracts.length;
      this.requestedButExcludedCount = dbProjection.requestedButExcludedLocations.length;

      this.desiredDataAmount = dbProjection.requestedData?.desiredDataAmount;
      this.totalPromisedDataAmount = dbProjection.totalPromisedDataAmount;
      this.totalContractedDataAmount = dbProjection.totalContractedDataAmount;

      this.openFdpgTasks = dbProjection.openFdpgTasks || [];
    } else if (user.isFromLocation) {
      this.locationState = getMostAdvancedState(dbProjection, user);
    }
  }

  projectAbbreviation: string;
  projectTitle: string;
  ownerName: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  status: ProposalStatus;
  isLocked: boolean;
  submittedAt?: Date;
  dueDateForStatus?: Date;

  contractAcceptedByResearcher: boolean;
  contractRejectedByResearcher: boolean;

  requestedLocationsCount?: number;
  approvedLocationsCount?: number;
  openDizChecksCount?: number;
  dizApprovedCount?: number;
  uacApprovedCount?: number;
  signedContractsCount?: number;
  requestedButExcludedCount?: number;

  desiredDataAmount?: number;
  totalPromisedDataAmount?: number;
  totalContractedDataAmount?: number;

  openFdpgTasks?: FdpgTaskGetDto[];
  locationState?: LocationState;

  _id: string;
  selectedDataSources: PlatformIdentifier[];
  type: ProposalType;
  registerInfo?: RegisterInfoDto;
  registerFormId?: string;
}

@Exclude()
export class ProposalMarkConditionAcceptedReturnDto {
  @ExposeUpload()
  uploads: UploadGetDto[];

  @ExposeHistory()
  history: HistoryEventGetDto[];

  @Expose()
  numberOfApprovedLocations?: number;

  @Expose()
  totalPromisedDataAmount?: number;

  @Expose()
  openDizChecks: string[];

  @Expose()
  openDizConditionChecks: string[];

  @Expose()
  dizApprovedLocations: string[];

  @Expose()
  uacApprovedLocations: string[];

  @Expose()
  requestedButExcludedLocations: string[];

  @Expose()
  @Type(() => ConditionalApprovalGetDto)
  conditionalApprovals: ConditionalApprovalGetDto[];

  @Expose()
  @Type(() => UacApprovalGetDto)
  uacApprovals: UacApprovalGetDto[];
}
