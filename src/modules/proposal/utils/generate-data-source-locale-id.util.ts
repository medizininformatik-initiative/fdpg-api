import { Model } from 'mongoose';
import { ProposalDocument } from '../schema/proposal.schema';

export async function generateDataSourceLocaleId(proposalModel: Model<ProposalDocument>): Promise<string> {
  const lastProposal = await proposalModel
    .findOne({ dataSourceLocaleId: { $regex: '^DIFE_' } })
    .sort({ dataSourceLocaleId: -1 })
    .exec();

  if (!lastProposal || !lastProposal.dataSourceLocaleId) {
    return 'DIFE_00001';
  }

  const lastNumber = parseInt(lastProposal.dataSourceLocaleId.split('_')[1]);
  const nextNumber = lastNumber + 1;
  return `DIFE_${nextNumber.toString().padStart(5, '0')}`;
}
