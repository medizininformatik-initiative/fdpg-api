import { FdpgChecklistUpdateDto } from '../dto/proposal/fdpg-checklist.dto';
import { Proposal } from '../schema/proposal.schema';
import { initChecklist } from '../dto/proposal/fdpg-checklist.dto';

export const updateFdpgChecklist = (proposal: Proposal, checklistUpdate: FdpgChecklistUpdateDto) => {
  if (!proposal || !checklistUpdate) {
    return;
  }

  // Initialize checklist if it doesn't exist
  if (!proposal.fdpgChecklist) {
    proposal.fdpgChecklist = initChecklist();
  }

  // Direct field updates
  if (checklistUpdate.isRegistrationLinkSent !== undefined) {
    proposal.fdpgChecklist.isRegistrationLinkSent = checklistUpdate.isRegistrationLinkSent;
  }

  if (checklistUpdate.fdpgInternalCheckNotes !== undefined) {
    proposal.fdpgChecklist.fdpgInternalCheckNotes = checklistUpdate.fdpgInternalCheckNotes.trim();
  }

  if (!checklistUpdate._id) {
    return;
  }

  const targetFields = ['checkListVerification', 'projectProperties'] as const;
  const excludedFields = ['_id', 'isRegistrationLinkSent', 'fdpgInternalCheckNotes'] as const;

  for (const field of targetFields) {
    const items = proposal.fdpgChecklist[field];
    if (!items) continue;

    const itemIndex = items.findIndex((item) => item._id.toString() === checklistUpdate._id?.toString());

    if (itemIndex !== -1) {
      Object.entries(checklistUpdate).forEach(([key, value]) => {
        if (!excludedFields.includes(key as (typeof excludedFields)[number])) {
          items[itemIndex][key] = value;
        }
      });
      break;
    }
  }
};
