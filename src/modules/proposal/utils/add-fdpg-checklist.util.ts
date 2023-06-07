import { FdpgChecklistSetDto, initChecklist } from '../dto/proposal/fdpg-checklist.dto';
import { Proposal } from '../schema/proposal.schema';

export const addFdpgChecklist = (proposal: Proposal, checklist: FdpgChecklistSetDto) => {
  if (proposal.fdpgChecklist) {
    Object.keys(checklist).forEach((key) => (proposal.fdpgChecklist[key] = checklist[key]));
  } else {
    proposal.fdpgChecklist = initChecklist(checklist);
  }
};
