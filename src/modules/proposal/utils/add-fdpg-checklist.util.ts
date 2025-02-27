import { FdpgChecklistUpdateDto } from '../dto/proposal/fdpg-checklist.dto';
import { Proposal } from '../schema/proposal.schema';

export const updateFdpgChecklist = (proposal: Proposal, checklistUpdate: FdpgChecklistUpdateDto) => {
  if (!proposal.fdpgChecklist) return;

  // Direct field updates
  if (checklistUpdate.isRegistrationLinkSent !== undefined) {
    proposal.fdpgChecklist.isRegistrationLinkSent = checklistUpdate.isRegistrationLinkSent;
  }

  if (checklistUpdate.fdpgInternalCheckNotes !== undefined) {
    proposal.fdpgChecklist.fdpgInternalCheckNotes = checklistUpdate.fdpgInternalCheckNotes;
  }

  if (!checklistUpdate._id) return;

  const targetFields = ['checkListVerification', 'projectProperties'];

  targetFields.some((field) => {
    const itemIndex = proposal.fdpgChecklist[field]?.findIndex(
      (item) => item._id.toString() === checklistUpdate._id?.toString(),
    );
    if (itemIndex !== -1 && itemIndex !== undefined) {
      Object.keys(checklistUpdate).forEach((key) => {
        if (!['_id', 'isRegistrationLinkSent', 'fdpgInternalCheckNotes'].includes(key)) {
          proposal.fdpgChecklist[field][itemIndex][key] = checklistUpdate[key];
        }
      });

      return true;
    }
    return false;
  });
};
