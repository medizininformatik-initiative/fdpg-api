import { ClassTransformOptions, Exclude, Expose, Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsObject, IsOptional, Matches, MaxLength, ValidateNested } from 'class-validator';
import { MiiLocation } from 'src/shared/constants/mii-locations';
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

const getRoleFromTransform = (options: ClassTransformOptions) => {
  const [role] = options.groups
    .filter((entry) => entry.startsWith('GROUP_USER_ROLE_'))
    .map((roleStr) => roleStr.replace('GROUP_USER_ROLE_', ''));
  const [location] = options.groups
    .filter((entry) => entry.startsWith('GROUP_USER_LOCATION_'))
    .map((locationStr) => locationStr.replace('GROUP_USER_LOCATION_', ''));

  return { role, location };
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
  requestedData: RequestedDataDto;

  @Expose()
  @IsEnum(ProposalStatus)
  status: ProposalStatus;

  @Expose()
  @IsEnum(PlatformIdentifier)
  @IsOptional()
  platform: PlatformIdentifier;
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

  @ExposeUpload()
  uploads: UploadGetDto[];

  @Expose()
  @Type(() => PublicationGetDto)
  publications: PublicationGetDto[];

  @ExposeHistory()
  history: HistoryEventGetDto[];

  @Expose({ groups: [Role.FdpgMember] })
  @Transform((params) => initChecklist(params.obj[params.key]))
  fdpgChecklist: FdpgChecklistGetDto;

  @Expose({ groups: [Role.FdpgMember] })
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

  @Expose({ groups: [Role.FdpgMember] })
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

  @Expose({ groups: [Role.FdpgMember, Role.Researcher] })
  totalPromisedDataAmount?: number;

  @Expose({ groups: [Role.FdpgMember, Role.Researcher] })
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
  @Expose({ groups: [Role.FdpgMember, Role.Researcher] })
  openDizChecks: MiiLocation[];

  @Expose({ groups: [Role.FdpgMember, Role.Researcher] })
  dizApprovedLocations: MiiLocation[];

  @Expose({ groups: [Role.FdpgMember, Role.Researcher, Role.DizMember] })
  @Transform(({ value, options }) => {
    const { role, location } = getRoleFromTransform(options);

    return value.filter((miiLoc: MiiLocation) => {
      if (role === Role.DizMember) {
        return miiLoc === location;
      }

      return true;
    });
  })
  openDizConditionChecks: MiiLocation[];

  @Expose({ groups: [Role.FdpgMember, Role.Researcher] })
  uacApprovedLocations: MiiLocation[];

  @Expose({ groups: [Role.FdpgMember, Role.Researcher] })
  requestedButExcludedLocations: MiiLocation[];

  @Expose({ groups: [Role.FdpgMember, Role.Researcher] })
  signedContracts: MiiLocation[];

  @Expose({ groups: [Role.FdpgMember, Role.DizMember, Role.UacMember] })
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

  // LOCATION Tasks <----

  // Conditional and UAC approval are stored additionally to the "flow-arrays" and are persistent
  @Expose({ groups: [Role.FdpgMember, Role.Researcher, Role.DizMember] })
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

  @Expose({ groups: [Role.FdpgMember, Role.Researcher] })
  @Type(() => ConditionalApprovalGetDto)
  conditionalApprovals: ConditionalApprovalGetDto[];

  @Expose({ groups: [Role.FdpgMember, Role.Researcher] })
  @Type(() => UacApprovalGetDto)
  uacApprovals: UacApprovalGetDto[];

  @Expose({ groups: [Role.FdpgMember, Role.Researcher] })
  @Type(() => DeclineReasonDto)
  declineReasons: DeclineReasonDto[];

  @Expose({ groups: [Role.FdpgMember, Role.DizMember, Role.UacMember, OutputGroup.PdfOutput] })
  fdpgCheckNotes?: string;

  @Expose({ groups: [Role.Researcher] })
  isParticipatingScientist: boolean;
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

    if (user.singleKnownRole === Role.FdpgMember) {
      this.openDizChecksCount = dbProjection.openDizChecks.length;
      this.dizApprovedCount = dbProjection.dizApprovedLocations.length;
      this.uacApprovedCount = dbProjection.uacApprovedLocations.length;
      this.signedContractsCount = dbProjection.signedContracts.length;
      this.requestedButExcludedCount = dbProjection.requestedButExcludedLocations.length;

      this.desiredDataAmount = dbProjection.requestedData.desiredDataAmount;
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
  openDizChecks: MiiLocation[];

  @Expose()
  openDizConditionChecks: MiiLocation[];

  @Expose()
  dizApprovedLocations: MiiLocation[];

  @Expose()
  uacApprovedLocations: MiiLocation[];

  @Expose()
  requestedButExcludedLocations: MiiLocation[];

  @Expose()
  @Type(() => ConditionalApprovalGetDto)
  conditionalApprovals: ConditionalApprovalGetDto[];

  @Expose()
  @Type(() => UacApprovalGetDto)
  uacApprovals: UacApprovalGetDto[];
}
