import { defaultDueDateValues, DueDateEnum } from '../../enums/due-date.enum';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import {
  getDueDateForFdpgCheck,
  getDueDateForLocationCheck,
  getDueDateForLocationContracting,
  getDueDateForExpectDataDelivery,
  getDueDateForDataResearch,
  getDueDateForDataCorrupt,
  getDueDateForFinishedProject,
  setDueDate,
  getDueDateChangeList,
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
    expect(proposal.deadlines[DueDateEnum.DUE_DAYS_FDPG_CHECK]).toEqual(getDueDateForFdpgCheck());
  });

  it('should set the due date for LocationCheck', () => {
    const proposal = getProposalDocument();
    proposal.status = ProposalStatus.LocationCheck;
    setDueDate(proposal);
    expect(proposal.dueDateForStatus).toEqual(getDueDateForLocationCheck());
    expect(proposal.deadlines[DueDateEnum.DUE_DAYS_LOCATION_CHECK]).toEqual(getDueDateForLocationCheck());
  });

  it('should set the due date for LocationContracting', () => {
    const proposal = getProposalDocument();
    proposal.status = ProposalStatus.Contracting;
    setDueDate(proposal, true);
    expect(proposal.dueDateForStatus).toEqual(getDueDateForLocationContracting());
    expect(proposal.deadlines[DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING]).toEqual(getDueDateForLocationContracting());
  });

  it('should not set the due date for LocationContracting', () => {
    const proposal = getProposalDocument();
    proposal.status = ProposalStatus.Contracting;
    setDueDate(proposal, false);
    expect(proposal.dueDateForStatus).toEqual(undefined);
    expect(proposal.deadlines[DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING]).toEqual(undefined);
  });

  it('should set the due date for ExpectDataDelivery', () => {
    const proposal = getProposalDocument();
    proposal.status = ProposalStatus.ExpectDataDelivery;
    setDueDate(proposal);
    expect(proposal.dueDateForStatus).toEqual(getDueDateForExpectDataDelivery());
    expect(proposal.deadlines[DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY]).toEqual(getDueDateForExpectDataDelivery());
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
    expect(proposal.deadlines[DueDateEnum.DUE_DAYS_DATA_CORRUPT]).toEqual(getDueDateForDataCorrupt());
  });

  it('should set the due date for FinishedProject', () => {
    const proposal = getProposalDocument();
    proposal.status = ProposalStatus.FinishedProject;
    setDueDate(proposal);
    expect(proposal.dueDateForStatus).toEqual(getDueDateForFinishedProject());
    expect(proposal.deadlines[DueDateEnum.DUE_DAYS_FINISHED_PROJECT]).toEqual(getDueDateForFinishedProject());
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
      expect(
        Object.keys(proposal.deadlines)
          .map((key) => proposal.deadlines[key])
          .filter((val) => val).length,
      ).toEqual(0);
    });
  });

  describe('it should return a change list', () => {
    const persistedDeadlines = {
      [DueDateEnum.DUE_DAYS_FDPG_CHECK]: new Date(2027, 7, 17),
      [DueDateEnum.DUE_DAYS_LOCATION_CHECK]: null,
      [DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING]: new Date(2027, 8, 1),
      [DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY]: new Date(2027, 8, 15),
      [DueDateEnum.DUE_DAYS_DATA_CORRUPT]: null,
      [DueDateEnum.DUE_DAYS_FINISHED_PROJECT]: null,
    };

    const newDeadlines = {
      [DueDateEnum.DUE_DAYS_FDPG_CHECK]: new Date(2027, 7, 17),
      [DueDateEnum.DUE_DAYS_LOCATION_CHECK]: null,
      [DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING]: new Date(2027, 8, 2),
      [DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY]: null,
      [DueDateEnum.DUE_DAYS_DATA_CORRUPT]: null,
      [DueDateEnum.DUE_DAYS_FINISHED_PROJECT]: null,
    };

    const expectedResult = {
      [DueDateEnum.DUE_DAYS_LOCATION_CONTRACTING]: new Date(2027, 8, 2),
      [DueDateEnum.DUE_DAYS_EXPECT_DATA_DELIVERY]: null,
    };

    const result = getDueDateChangeList(persistedDeadlines, newDeadlines);

    expect(Object.keys(result).length).toEqual(Object.keys(expectedResult).length);
    Object.keys(expectedResult).forEach((key) =>
      expect(result[key]?.getTime?.()).toEqual(expectedResult[key]?.getTime?.()),
    );
  });
});
