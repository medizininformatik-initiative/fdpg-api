import { IsDoneOverviewGetDto } from '../../dto/is-done-overview';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import { getIsDoneOverview } from '../is-done-overview.util';

const proposalId = 'proposalId';

const proposalContent = {
  _id: proposalId,
  projectAbbreviation: 'projectAbbreviation',
  status: ProposalStatus.Draft,
  applicant: {
    isDone: true,
    _id: 'applicantId',
  },
  projectResponsible: {
    isDone: false,
    _id: 'projectResponsible',
  },
  projectUser: {
    isDone: false,
    _id: 'projectUserId',
  },
  participants: [
    {
      researcher: {
        isDone: true,
        _id: 'researcherId',
      },
    },
    {
      institute: {
        isDone: false,
        _id: 'instituteId',
      },
    },
  ],
};
const getProposalDocument = () => {
  const proposalDocument = {
    ...JSON.parse(JSON.stringify(proposalContent)),
  };
  return proposalDocument as any as ProposalDocument;
};

describe('is-done-overview.util', () => {
  it('should return the is done overview', () => {
    const proposal = getProposalDocument();
    const result = getIsDoneOverview(proposal);
    expect(result.fieldCount).toEqual(5);
    expect(result.isDoneCount).toEqual(2);
  });
});
