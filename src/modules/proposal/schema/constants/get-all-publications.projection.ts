import { NestedPath } from 'src/shared/types/nested-key-of.type';
import { Proposal } from '../proposal.schema';

export const getAllPublicationsProjection: Partial<Record<NestedPath<Proposal>, number>> = {
  publications: 1,
};
