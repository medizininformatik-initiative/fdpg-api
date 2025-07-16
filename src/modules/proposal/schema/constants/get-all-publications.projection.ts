import { Proposal } from '../proposal.schema';

export const getAllPublicationsProjection: Partial<Record<NestedPath<Proposal>, number>> = {
  publications: 1,
};
