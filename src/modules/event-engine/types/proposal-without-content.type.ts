import { Proposal } from 'src/modules/proposal/schema/proposal.schema';

export type ProposalWithoutContent = Omit<Proposal, 'userProject'>;
