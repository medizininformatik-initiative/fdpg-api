import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { ProposalStatus } from '../enums/proposal-status.enum';
import { ProposalType } from '../enums/proposal-type.enum';
import { Proposal, ProposalDocument } from '../schema/proposal.schema';
import { ProposalCrudService } from './proposal-crud.service';
import { StatusChangeService } from './status-change.service';
import { ProposalFormService } from 'src/modules/proposal-form/proposal-form.service';
import { addHistoryItemForCopyAsInternalRegistration } from '../utils/proposal-history.util';

@Injectable()
export class RegistrationFormCopyService {
  constructor(
    @InjectModel(Proposal.name)
    private proposalModel: Model<ProposalDocument>,
    private proposalCrudService: ProposalCrudService,
    private statusChangeService: StatusChangeService,
    private proposalFormService: ProposalFormService,
  ) {}

  async copyAsInternalRegistration(proposalId: string, user: IRequestUser): Promise<string> {
    const original = await this.proposalCrudService.findDocument(proposalId, user);

    const validStatuses = [
      ProposalStatus.Contracting,
      ProposalStatus.ExpectDataDelivery,
      ProposalStatus.DataResearch,
      ProposalStatus.DataCorrupt,
      ProposalStatus.FinishedProject,
    ];

    if (!validStatuses.includes(original.status)) {
      throw new BadRequestException('Proposal must be in Contracting or later status to register');
    }

    const originalObj = original.toObject();

    this.resetIsDoneFlags(originalObj);

    // If applicant is also the responsible scientist, copy their data to projectResponsible
    let projectResponsible = originalObj.projectResponsible;
    if (originalObj.projectResponsible?.projectResponsibility?.applicantIsProjectResponsible && originalObj.applicant) {
      // When applicantIsProjectResponsible is true, copy applicant data to projectResponsible
      projectResponsible = {
        ...originalObj.projectResponsible,
        researcher: originalObj.applicant.researcher,
        institute: originalObj.applicant.institute,
        participantCategory: originalObj.applicant.participantCategory,
        // Keep the projectResponsibility but set applicantIsProjectResponsible to false for the registration
        projectResponsibility: {
          ...originalObj.projectResponsible.projectResponsibility,
          applicantIsProjectResponsible: false,
        },
      };
    }

    let newAbbreviation = `${original.projectAbbreviation}-REG`;
    let suffix = 1;

    while (await this.proposalModel.findOne({ projectAbbreviation: newAbbreviation })) {
      newAbbreviation = `${original.projectAbbreviation}-REG${suffix}`;
      suffix++;
    }

    // Calculate startTime for registerInfo: DUE_DAYS_LOCATION_CHECK + 7 days
    const locationCheckDate = originalObj.deadlines?.DUE_DAYS_LOCATION_CHECK;
    const startTime = locationCheckDate ? new Date(locationCheckDate.getTime() + 7 * 24 * 60 * 60 * 1000) : null;

    const copyData = {
      ...originalObj,
      _id: undefined,
      projectAbbreviation: newAbbreviation,
      dataSourceLocaleId: undefined, // Clear DIFE ID - not needed for registration and must be unique
      type: ProposalType.RegisteringForm,
      registerInfo: {
        isInternalRegistration: true,
        originalProposalId: original._id.toString(),
        originalProposalStatus: original.status,
        startTime,
        locations: originalObj.signedContracts || [],
      },
      status: ProposalStatus.Draft,
      owner: originalObj.owner,
      ownerId: originalObj.ownerId,
      ownerName: originalObj.ownerName,
      applicant: originalObj.applicant,
      projectResponsible: projectResponsible,
      participants: originalObj.participants,
      userProject: {
        ...originalObj.userProject,
        generalProjectInformation: {
          ...originalObj.userProject?.generalProjectInformation,
        },
        addressees: {
          ...originalObj.userProject?.addressees,
        },
      },
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: { mayor: 0, minor: 0 },
    } as ProposalDocument;

    const newProposal = new this.proposalModel(copyData);
    const formVersion = await this.proposalFormService.getCurrentVersion();
    newProposal.formVersion = formVersion;

    addHistoryItemForCopyAsInternalRegistration(newProposal, user, original.projectAbbreviation);

    await this.statusChangeService.handleEffects(newProposal, null, user);
    const saveResult = await newProposal.save();
    original.registerFormId = saveResult._id.toString();
    await original.save();
    return saveResult._id.toString();
  }

  private resetIsDoneFlags(proposal: any): void {
    const resetInObject = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;

      if (Array.isArray(obj)) {
        obj.forEach((item) => resetInObject(item));
        return;
      }

      if ('isDone' in obj) {
        obj.isDone = false;
      }

      Object.values(obj).forEach((value) => {
        if (value && typeof value === 'object') {
          resetInObject(value);
        }
      });
    };

    resetInObject(proposal);
  }
}
