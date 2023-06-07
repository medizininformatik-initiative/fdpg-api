import { FdpgChecklistSetDto } from '../../dto/proposal/fdpg-checklist.dto';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import { addFdpgChecklist } from '../add-fdpg-checklist.util';

describe('addFdpgChecklist', () => {
  const proposalId = 'proposalId';

  const proposalContent = {
    _id: proposalId,
    projectAbbreviation: 'projectAbbreviation',
    status: ProposalStatus.FdpgCheck,
    fdpgChecklist: {
      isRegistrationLinkSent: true,
      isUnique: true,
      isAttachmentsChecked: true,
      isChecked: true,
    },
  };
  const getProposalDocument = () => {
    const proposalDocument = {
      ...proposalContent,
    };
    return proposalDocument as any as ProposalDocument;
  };

  it('should merge the checklist updates to the existing checklist', () => {
    const proposal = getProposalDocument();
    const fdpgChecklistSetDto = {
      isRegistrationLinkSent: false,
      isUnique: true,
      isAttachmentsChecked: false,
    } as FdpgChecklistSetDto;

    addFdpgChecklist(proposal, fdpgChecklistSetDto);

    expect(proposal.fdpgChecklist).toEqual({
      isRegistrationLinkSent: false,
      isUnique: true,
      isAttachmentsChecked: false,
      isChecked: true,
    });
  });

  it('should init a new checklist with the updates if there is none', () => {
    const proposal = getProposalDocument();
    proposal.fdpgChecklist = undefined;
    const fdpgChecklistSetDto = {
      isRegistrationLinkSent: false,
      isUnique: true,
      isAttachmentsChecked: false,
    } as FdpgChecklistSetDto;

    addFdpgChecklist(proposal, fdpgChecklistSetDto);

    expect(proposal.fdpgChecklist).toEqual({
      isRegistrationLinkSent: false,
      isUnique: true,
      isAttachmentsChecked: false,
      isChecked: false,
    });
  });
});
