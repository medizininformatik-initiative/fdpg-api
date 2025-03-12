import { FdpgChecklistUpdateDto } from '../../dto/proposal/fdpg-checklist.dto';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import { updateFdpgChecklist } from '../add-fdpg-checklist.util';

describe('updateFdpgChecklist', () => {
  const proposalId = 'proposalId';
  const mockUser = 'test-user';
  const mockDate = new Date('2025-03-12T14:20:38.502Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

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
    const fdpgChecklistUpdateDto = {
      isRegistrationLinkSent: false,
      fdpgInternalCheckNotes: null,
    } as FdpgChecklistUpdateDto;

    updateFdpgChecklist(proposal, fdpgChecklistUpdateDto, mockUser);

    expect(proposal.fdpgChecklist).toEqual({
      isRegistrationLinkSent: false,
      isUnique: true,
      isAttachmentsChecked: true,
      isChecked: true,
      fdpgInternalCheckNotes: null,
    });
  });

  it('should init a new checklist with the updates if there is none', () => {
    const proposal = getProposalDocument();
    proposal.fdpgChecklist = undefined;
    const fdpgChecklistUpdateDto = {
      isRegistrationLinkSent: false,
      fdpgInternalCheckNotes: null,
    } as FdpgChecklistUpdateDto;

    updateFdpgChecklist(proposal, fdpgChecklistUpdateDto, mockUser);

    expect(proposal.fdpgChecklist).toEqual({
      isRegistrationLinkSent: false,
      fdpgInternalCheckNotes: null,
      checkListVerification: expect.any(Array),
      projectProperties: expect.any(Array),
    });
  });

  it('should update internal check notes with user and date', () => {
    const proposal = getProposalDocument();
    const note = { note: 'test note' };
    const fdpgChecklistUpdateDto = {
      isRegistrationLinkSent: false,
      fdpgInternalCheckNotes: note,
    } as FdpgChecklistUpdateDto;

    updateFdpgChecklist(proposal, fdpgChecklistUpdateDto, mockUser);

    expect(proposal.fdpgChecklist).toEqual({
      isRegistrationLinkSent: false,
      isUnique: true,
      isAttachmentsChecked: true,
      isChecked: true,
      fdpgInternalCheckNotes: {
        ...note,
        date: mockDate,
        user: mockUser,
      },
    });
  });
});
