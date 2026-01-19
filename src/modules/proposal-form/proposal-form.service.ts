import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ApplicationFormSchemaType,
  ApplicationFormSchemaValueType,
  ProposalForm,
  ProposalFormDocument,
} from './schema/proposal-form.schema';
import { Model } from 'mongoose';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { ProposalFormDto } from './dto/proposal-form.dto';
import { ProposalBaseDto } from '../proposal/dto/proposal/proposal.dto';
import { OutputGroup } from 'src/shared/enums/output-group.enum';
import { Proposal } from '../proposal/schema/proposal.schema';
import { ClassConstructor } from 'class-transformer';
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';
import 'reflect-metadata';
import { ProposalType } from '../proposal/enums/proposal-type.enum';

@Injectable()
export class ProposalFormService {
  constructor(
    @InjectModel(ProposalForm.name)
    private proposalFormModel: Model<ProposalFormDocument>,
  ) {}

  private currentVersion = undefined;

  async findAll(): Promise<ProposalFormDto[]> {
    const result = await this.proposalFormModel.find({}).lean();
    return plainToInstance(ProposalFormDto, result, {
      strategy: 'excludeAll',
    });
  }

  async getCurrentVersion(): Promise<number> {
    if (this.currentVersion) {
      return this.currentVersion;
    }

    const result = await this.findAll();

    const maxVersion = result
      .map((proposalForm) => proposalForm.formVersion)
      .filter((version) => version)
      .reduce((accumulator, currentValue) => {
        return Math.max(accumulator, currentValue);
      }, 0);

    this.currentVersion = maxVersion;

    return this.currentVersion;
  }

  async findMostRecentProposalForm(): Promise<ProposalFormDocument> {
    const mostRecentVersion = await this.getCurrentVersion();
    const form = await this.findForVersion(mostRecentVersion);

    if (!form) {
      throw new NotFoundException(`Cannot find most current form with version ${mostRecentVersion}`);
    }

    return form;
  }

  private async findForVersion(formVersion: number): Promise<ProposalFormDocument | null> {
    return await this.proposalFormModel.findOne({ formVersion });
  }

  async getProposalUiFields(proposal: Proposal): Promise<ProposalBaseDto | any> {
    if (proposal.type !== ProposalType.ApplicationForm) {
      throw new Error(`Proposal Application Forms Schemas cannot be applied to ${proposal.type}`);
    }

    const form = (await this.findForVersion(proposal.formVersion)).toObject();

    const proposalFormValues = form?.formSchema ? this.mapFormSchemaToProposal(form.formSchema, proposal) : {};

    return { proposalId: proposal._id, formVersion: form?.formVersion ?? null, proposalFormValues };
  }

  private mapFormSchemaToProposal(
    formSchema: ApplicationFormSchemaType,
    proposal: Partial<Proposal> = {},
  ): ApplicationFormSchemaValueType {
    if (!formSchema) return {};

    return Object.entries(formSchema).reduce((acc, [key, schemaValue]) => {
      const proposalValue = proposal?.[key];

      if (Array.isArray(schemaValue)) {
        if (Array.isArray(proposalValue) && proposalValue.length === 0) {
          acc[key] = [];
        } else {
          acc[key] = schemaValue.map((schemaItem, index) => {
            const proposalItem = Array.isArray(proposalValue) ? proposalValue[index] : {};
            return this.mapFormSchemaToProposal(schemaItem, proposalItem);
          });
        }

        return acc;
      }

      if (schemaValue && typeof schemaValue === 'object' && !('type' in schemaValue)) {
        if (!proposalValue) {
          acc[key] = null;
        } else {
          acc[key] = this.mapFormSchemaToProposal(schemaValue, proposalValue as any);
        }

        return acc;
      }

      acc[key] = {
        ...schemaValue,
        value: proposalValue ?? null,
      };

      return acc;
    }, {} as ApplicationFormSchemaValueType);
  }

  private createDeepDummy<T>(cls: ClassConstructor<T>): T {
    const instance = new cls();
    const exposedMetadatas = defaultMetadataStorage.getExposedMetadatas(cls);

    exposedMetadatas.forEach((metadata) => {
      const propertyName = metadata.propertyName;
      const typeMetadata = defaultMetadataStorage.findTypeMetadata(cls, propertyName);

      if (typeMetadata) {
        const childClass = typeMetadata.typeFunction() as ClassConstructor<any>;
        const reflectionType = Reflect.getMetadata('design:type', instance, propertyName);
        const isArray = reflectionType === Array;
        const childDummy = this.createDeepDummy(childClass);

        if (isArray) {
          (instance as any)[propertyName] = [childDummy];
        } else {
          (instance as any)[propertyName] = childDummy;
        }
      }
    });

    return instance;
  }

  getProposalUiSchema(): any {
    const dummy = this.createDeepDummy(ProposalBaseDto);
    return instanceToPlain(dummy, { groups: [OutputGroup.FormSchemaOnly], excludeExtraneousValues: true });
  }
}
