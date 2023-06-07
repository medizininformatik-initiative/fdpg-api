import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import {
  alterDaysOnDate,
  getDueDateForFdpgCheck,
  getDueDateForLocationCheck,
  getDueDateForLocationContracting,
  getDueDateForExpectDataDelivery,
  getDueDateForDataResearch,
  getDueDateForDataCorrupt,
  getDueDateForFinishedProject,
  setDueDate,
} from '../due-date.util';

const proposalId = 'proposalId';

const proposalContent = {
  _id: proposalId,
  projectAbbreviation: 'projectAbbreviation',
  status: ProposalStatus.Draft,
};
const getProposalDocument = () => {
  const proposalDocument = {
    ...JSON.parse(JSON.stringify(proposalContent)),
    userProject: {
      generalProjectInformation: {
        desiredStartTime: new Date(2030, 1, 1),
      },
    },
  };
  return proposalDocument as any as ProposalDocument;
};

describe('due-date.util', () => {
  it('should set the due date for FdpgCheck', () => {
    const proposal = getProposalDocument();
    proposal.status = ProposalStatus.FdpgCheck;
    setDueDate(proposal);
    expect(proposal.dueDateForStatus).toEqual(getDueDateForFdpgCheck());
  });

  it('should set the due date for LocationCheck', () => {
    const proposal = getProposalDocument();
    proposal.status = ProposalStatus.LocationCheck;
    setDueDate(proposal);
    expect(proposal.dueDateForStatus).toEqual(getDueDateForLocationCheck());
  });

  it('should set the due date for LocationContracting', () => {
    const proposal = getProposalDocument();
    proposal.status = ProposalStatus.Contracting;
    setDueDate(proposal, true);
    expect(proposal.dueDateForStatus).toEqual(getDueDateForLocationContracting());
  });

  it('should not set the due date for LocationContracting', () => {
    const proposal = getProposalDocument();
    proposal.status = ProposalStatus.Contracting;
    setDueDate(proposal, false);
    expect(proposal.dueDateForStatus).toEqual(undefined);
  });

  it('should set the due date for ExpectDataDelivery', () => {
    const proposal = getProposalDocument();
    proposal.status = ProposalStatus.ExpectDataDelivery;
    setDueDate(proposal);
    expect(proposal.dueDateForStatus).toEqual(getDueDateForExpectDataDelivery());
  });

  it('should set the due date for DataResearch', () => {
    const proposal = getProposalDocument();
    proposal.status = ProposalStatus.DataResearch;
    setDueDate(proposal);
    expect(proposal.dueDateForStatus).toEqual(getDueDateForDataResearch(proposal));
  });

  it('should set the due date for DataCorrupt', () => {
    const proposal = getProposalDocument();
    proposal.status = ProposalStatus.DataCorrupt;
    setDueDate(proposal);
    expect(proposal.dueDateForStatus).toEqual(getDueDateForDataCorrupt());
  });

  it('should set the due date for FinishedProject', () => {
    const proposal = getProposalDocument();
    proposal.status = ProposalStatus.FinishedProject;
    setDueDate(proposal);
    expect(proposal.dueDateForStatus).toEqual(getDueDateForFinishedProject());
  });

  describe('statuses without due date', () => {
    const statuses = [
      ProposalStatus.Archived,
      ProposalStatus.Draft,
      ProposalStatus.Rejected,
      ProposalStatus.ReadyToArchive,
      ProposalStatus.Rework,
    ];

    test.each(statuses)(`should set the due date for %s`, (status: ProposalStatus) => {
      const proposal = getProposalDocument();
      proposal.status = status;
      setDueDate(proposal);
      expect(proposal.dueDateForStatus).toEqual(undefined);
    });
  });
});
