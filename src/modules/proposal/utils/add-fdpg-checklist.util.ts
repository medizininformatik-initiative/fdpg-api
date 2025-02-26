import { FdpgChecklistUpdateDto } from '../dto/proposal/fdpg-checklist.dto';
import { Proposal } from '../schema/proposal.schema';

/**
 * Updates `isRegistrationLinkSent`, `fdpgInternalCheckNotes`, `checkListVerification`, or `projectProperties` using `_id`.
 * Automatically updates `isAnswered` if at least one option is selected.
 */
export const updateFdpgChecklist = (proposal: Proposal, checklistUpdate: FdpgChecklistUpdateDto) => {
  if (!proposal.fdpgChecklist) return;

  // Direct field updates
  if (checklistUpdate.isRegistrationLinkSent !== undefined) {
    proposal.fdpgChecklist.isRegistrationLinkSent = checklistUpdate.isRegistrationLinkSent;
  }

  if (checklistUpdate.fdpgInternalCheckNotes !== undefined) {
    proposal.fdpgChecklist.fdpgInternalCheckNotes = checklistUpdate.fdpgInternalCheckNotes;
  }

  if (!checklistUpdate._id) return; // Skip if no _id is provided

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

      // **Automatically set `isAnswered` based on selected options**
      const options = proposal.fdpgChecklist[field][itemIndex].options;
      proposal.fdpgChecklist[field][itemIndex].isAnswered = options.some((option) => option.isSelected);

      return true; // Stop the loop once an item is found and updated
    }
    return false; // Continue if no match is found
  });
};
