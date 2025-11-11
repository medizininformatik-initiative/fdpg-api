import { describeWithMongo, MongoTestContext } from 'src/test/mongo-test.helper';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { ProposalModule } from '../../proposal.module';
import { Location } from 'src/modules/location/schema/location.schema';
import { LocationModule } from 'src/modules/location/location.module';
import { Proposal } from '../../schema/proposal.schema';
import { KeycloakClient } from 'src/modules/user/keycloak.client';
import { FeasibilityAuthenticationClient } from 'src/modules/feasibility/feasibility-authentication.client';
import { forwardRef } from '@nestjs/common';
import { StorageService } from 'src/modules/storage/storage.service';
import { ParticipantType } from '../../enums/participant-type.enum';
import { ProjectUserType } from '../../enums/project-user-type.enum';
import { Department } from '../../enums/department.enum';
import { PublicationType } from '../../enums/publication-type.enum';
import { ProposalTypeOfUse, PseudonymizationInfoOptions } from '../../enums/proposal-type-of-use.enum';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { Role } from 'src/shared/enums/role.enum';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { ParticipantRoleType } from '../../enums/participant-role-type.enum';

describeWithMongo(
  'ProposalCrudServiceIT',
  [forwardRef(() => ProposalModule), LocationModule],
  [
    { provide: FeasibilityAuthenticationClient, useValue: { obtainToken: jest.fn() } },
    { provide: KeycloakClient, useValue: { obtainToken: jest.fn() } },
    { provide: StorageService, useValue: {} },
  ],
  (getContext) => {
    let context: MongoTestContext;
    // let locationService: LocationService;
    let locationModel: Model<Location>;
    // let proposalCrudService: ProposalCrudService;
    let proposalModel: Model<Proposal>;

    beforeEach(async () => {
      context = getContext();

      //   locationService = context.app.get<LocationService>(LocationService);
      locationModel = context.app.get<Model<Location>>(getModelToken(Location.name));

      //   proposalCrudService = context.app.get<ProposalCrudService>(ProposalCrudService);
      proposalModel = context.app.get<Model<Proposal>>(getModelToken(Proposal.name));

      await proposalModel.deleteMany({});
      await locationModel.deleteMany({});
    });

    it('should insert the model and find one', async () => {
      const location: Location = {
        _id: 'UKL',
        externalCode: 'UKL',
        display: 'UKL',
        consortium: 'consortium',
        dataIntegrationCenter: false,
        dataManagementCenter: false,
        deprecated: false,
      };
      await locationModel.create(location);

      const proposal = getDummyProposal();
      await proposalModel.create(proposal);
      const all = await proposalModel.find({});

      expect(all.length).toEqual(1);
    });

    it('should fail if the desired location does not exist', async () => {
      // no location created beforehand

      const proposal = getDummyProposal();
      await expect(proposalModel.create(proposal)).rejects.toThrow();
    });
  },
);

const getDummyProposal = (): Proposal => {
  return {
    _id: undefined,
    projectAbbreviation: 'DUMMY',
    participants: [],
    applicant: {
      researcher: {
        title: 'Dr.',
        firstName: 'ApplicantFirst',
        lastName: 'ApplicantLast',
        affiliation: 'affiliation',
        email: 'test@test.com',
        isDone: true,
        _id: undefined,
      },
      institute: {
        miiLocation: 'UKL',
        name: 'name',
        city: 'city',
        streetAddress: 'street',
        houseNumber: 'number',
        postalCode: 'code',
        email: 'emailInst@emailInst.com',
        isDone: true,
        _id: undefined,
      },
      participantCategory: {
        category: ParticipantType.ProjectLeader,
        isDone: true,
        _id: undefined,
      },
    },
    projectResponsible: {
      researcher: {
        title: 'title',
        firstName: 'firstName',
        lastName: 'lastName',
        affiliation: 'aff',
        email: 'email@email.com',
        _id: undefined,
        isDone: true,
      },
      projectResponsibility: {
        applicantIsProjectResponsible: true,
        isDone: true,
        _id: undefined,
      },
      participantCategory: { category: ParticipantType.ProjectLeader, isDone: true, _id: undefined },
      participantRole: {
        role: ParticipantRoleType.ResponsibleScientist,
        isDone: true,
        _id: undefined,
      },
      institute: {
        miiLocation: 'UKL',
        name: 'name',
        city: 'city',
        streetAddress: 'street',
        houseNumber: 'number',
        postalCode: 'code',
        email: 'emailInst@emailInst.com',
        isDone: true,
        _id: undefined,
      },
      addedByFdpg: false,
    },
    projectUser: {
      projectUserType: ProjectUserType.OrganizationOfProjectResponsible,
      isDone: true,
      _id: undefined,
    },
    userProject: {
      generalProjectInformation: {
        projectTitle: 'projectTitle',
        desiredStartTime: null,
        projectDuration: 12,
        projectFunding: 'projectFunding',
        isDone: false,
        _id: undefined,
        fundingReferenceNumber: 'fundingReferenceNumber',
        desiredStartTimeType: 'immediate',
        keywords: [],
      },
      informationOnRequestedBioSamples: {
        noSampleRequired: true,
        laboratoryResources: '',
        biosamples: [],
        isDone: true,
        _id: undefined,
      },
      feasibility: {
        id: 1,
        details: 'details',
        isDone: false,
        _id: undefined,
      },
      projectDetails: {
        simpleProjectDescription: 'simpleProjectDescription',
        department: [Department.Cardiology],
        scientificBackground: 'scientificBackground',
        hypothesisAndQuestionProjectGoals: 'hypothesisAndQuestionProjectGoals',
        materialAndMethods: 'materialAndMethods',
        isDone: false,
        _id: undefined,
        biometric: 'biometric',
        executiveSummaryUac: 'executiveSummaryUac',
        literature: 'literature',
      },
      ethicVote: {
        isExisting: true,
        ethicsCommittee: '',
        ethicsVoteNumber: '----',
        voteFromDate: new Date(),
        isDone: false,
        _id: undefined,
      },
      resourceAndRecontact: {
        hasEnoughResources: true,
        isRecontactingIntended: false,
        isDone: true,
        _id: undefined,
        reContactIncidental: false,
        suppSurveyReContacting: false,
        urgentIncidentalReContacting: false,
        reContactIncidentalText: 'reContactIncidentalText',
        suppSurveyReContactingText: 'suppSurveyReContactingText',
        urgentIncidentalReContactingText: 'urgentIncidentalReContactingText',
      },
      propertyRights: {
        options: 'None',
        isDone: true,
        _id: undefined,
      },
      plannedPublication: {
        publications: [
          {
            type: PublicationType.JournalArticle,
            description: 'descr',
            authors: 'authors',
            _id: undefined,
          },
        ],
        isDone: true,
        noPublicationPlanned: false,
        _id: undefined,
      },
      addressees: {
        desiredLocations: ['UKL'],
        isDone: true,
        _id: undefined,
      },
      typeOfUse: {
        usage: [ProposalTypeOfUse.Distributed],
        dataPrivacyExtra: 'dataPrivacyExtra',
        isDone: false,
        _id: undefined,
        difeUsage: [],
        pseudonymizationInfo: [PseudonymizationInfoOptions.siteGroupingEnabled],
        pseudonymizationInfoTexts: {
          enableRecordLinkage: '',
          siteGroupingEnabled: '',
          namedSiteVariable: '',
        },
      },
      cohorts: {
        selectedCohorts: [
          {
            label: 'cohort',
            uploadId: undefined,
            numberOfPatients: 0,
            _id: undefined,
            feasibilityQueryId: 0,
            isManualUpload: false,
          },
        ],
        details: 'details',
        isDone: false,
      },
      variableSelection: {
        isDone: false,
        _id: undefined,
      },
      selectionOfCases: {
        isDone: false,
        _id: undefined,
      },
    },
    requestedData: {
      patientInfo: 'patientInfo',
      dataInfo: 'dataInfo',
      desiredDataAmount: 1700,
      isDone: true,
      _id: undefined,
      desiredControlDataAmount: 1700,
    },
    status: ProposalStatus.LocationCheck,
    isLocked: false,
    openFdpgTasksCount: 0,
    openFdpgTasks: [],
    openDizChecks: ['UKL'],
    dizApprovedLocations: [],
    uacApprovedLocations: [],
    requestedButExcludedLocations: [],
    signedContracts: [],
    totalPromisedDataAmount: 0,
    totalContractedDataAmount: 0,
    contractAcceptedByResearcher: false,
    contractRejectedByResearcher: false,
    isContractingComplete: false,
    migrationVersion: 0,
    history: [],
    uploads: [],
    publications: [],
    reports: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    conditionalApprovals: [],
    uacApprovals: [],
    declineReasons: [],
    scheduledEvents: [],
    version: {
      mayor: 3,
      minor: 0,
    },
    ownerId: '51b933c7-d3d9-4617-9400-45a44b387326',
    ownerName: 'ownerName',
    owner: {
      id: '51b933c7-d3d9-4617-9400-45a44b387326',
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'email@email.com',
      username: 'username',
      role: Role.Researcher,
      miiLocation: 'UKL',
    },
    fdpgChecklist: {
      isRegistrationLinkSent: true,
      initialViewing: true,
      depthCheck: true,
      ethicsCheck: true,
      checkListVerification: [],
      fdpgInternalCheckNotes: null,
      projectProperties: [],
    },
    submittedAt: new Date(),
    additionalLocationInformation: [],
    deadlines: {
      DUE_DAYS_FDPG_CHECK: new Date(),
      DUE_DAYS_LOCATION_CHECK: new Date(),
      DUE_DAYS_LOCATION_CONTRACTING: null,
      DUE_DAYS_EXPECT_DATA_DELIVERY: null,
      DUE_DAYS_DATA_CORRUPT: null,
      DUE_DAYS_FINISHED_PROJECT: null,
    },
    formVersion: 1,
    locationConditionDraft: [],
    openDizConditionChecks: [],
    selectedDataSources: [PlatformIdentifier.Mii],
    dueDateForStatus: new Date(),
    platform: PlatformIdentifier.Mii,
    dizDetails: [],
    numberOfRequestedLocations: 11,
    statusChangeToLocationCheckAt: new Date(),
    statusChangeToLocationContractingAt: undefined,
    dataSourceLocaleId: '',
    numberOfApprovedLocations: 0,
    numberOfSignedLocations: 0,
    contractRejectedByResearcherReason: '',
    researcherSignedAt: undefined,
  };
};
