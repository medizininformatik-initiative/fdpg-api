import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ProposalForm, ProposalFormDocument } from './schema/proposal-form.schema';
import { Model } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { ProposalFormDto } from './dto/proposal-form.dto';

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
}
