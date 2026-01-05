import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ProposalForm, ProposalFormDocument } from './schema/proposal-form.schema';
import { Model } from 'mongoose';
import { instanceToPlain, plainToClass, plainToInstance } from 'class-transformer';
import { ProposalFormDto } from './dto/proposal-form.dto';
import { ProposalBaseDto } from '../proposal/dto/proposal/proposal.dto';
import { OutputGroup } from 'src/shared/enums/output-group.enum';
import { Proposal } from '../proposal/schema/proposal.schema';
import { ClassConstructor } from 'class-transformer';
import { defaultMetadataStorage } from 'class-transformer/cjs/storage'; // Import from storage
import 'reflect-metadata'; // Ensure this is imported
@Injectable()
export class ProposalFormService {
  constructor(
    @InjectModel(ProposalForm.name)
    private proposalFormModel: Model<ProposalFormDocument>,
  ) {}

  currentVersion = undefined;

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

  getProposalUiFields(proposal: Proposal): ProposalBaseDto | any {
    const form = plainToClass(ProposalBaseDto, proposal, { groups: [OutputGroup.WithFormSchema] });

    return { proposalId: proposal._id, formVersion: proposal.formVersion ?? 1, form };
  }

  createDeepDummy<T>(cls: ClassConstructor<T>): T {
    // 1. Create the root instance
    const instance = new cls();

    // 2. Get all exposed properties for this class
    // Since your @UiWidget and @UiNested use @Expose, they will show up here.
    const exposedMetadatas = defaultMetadataStorage.getExposedMetadatas(cls);

    // 3. Iterate over every exposed property
    exposedMetadatas.forEach((metadata) => {
      const propertyName = metadata.propertyName;

      // 4. Check if this property has a @Type decorator (meaning it's nested)
      const typeMetadata = defaultMetadataStorage.findTypeMetadata(cls, propertyName);

      if (typeMetadata) {
        // 5. Get the Child Class Constructor from the @Type(() => Child) function
        // typeMetadata.typeFunction returns the class constructor
        const childClass = typeMetadata.typeFunction() as ClassConstructor<any>;

        // 6. Check if it is an Array
        // We use standard Reflection to see if the TS type is Array
        const reflectionType = Reflect.getMetadata('design:type', instance, propertyName);
        const isArray = reflectionType === Array;

        // 7. Recursive Creation
        const childDummy = this.createDeepDummy(childClass);

        // 8. Assign to the instance
        if (isArray) {
          // If array, wrap in list so schema generates for children
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
