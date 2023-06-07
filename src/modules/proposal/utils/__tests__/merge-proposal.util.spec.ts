import { ProposalUpdateDto } from '../../dto/proposal/proposal.dto';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import { mergeProposal } from '../merge-proposal.util';

const proposalId = 'proposalId';

const proposalContent = {
  _id: proposalId,
  projectAbbreviation: 'projectAbbreviation',
  status: ProposalStatus.Draft,
  version: {
    minor: 0,
    mayor: 0,
  },
  applicant: {
    isDone: true,
    _id: 'applicantId',
  },
  projectResponsible: {
    isDone: false,
    content: 'projectResponsible',
    _id: 'projectResponsible',
  },
  projectUser: {
    isDone: false,
    content: 'projectUser',
    _id: 'projectUserId',
  },
  participants: [
    {
      _id: 'participantId',
      researcher: {
        isDone: true,
        content: 'researcher',
        _id: 'researcherId',
      },
      institute: {
        isDone: false,
        content: 'institute',
        _id: 'instituteId',
      },
    },
    {
      _id: 'participantIdRemove',
      researcher: {
        isDone: true,
        content: 'researcher',
        _id: 'researcherId',
      },
      institute: {
        isDone: false,
        content: 'institute',
        _id: 'instituteId',
      },
    },
    {
      _id: 'participantIdRemove2',
      researcher: {
        isDone: true,
        content: 'researcher',
        _id: 'researcherId',
      },
      institute: {
        isDone: false,
        content: 'institute',
        _id: 'instituteId',
      },
    },
  ],
};
const getProposalDocument = () => {
  const proposalDocument = {
    ...JSON.parse(JSON.stringify(proposalContent)),
    modifiedPaths: jest.fn().mockReturnValue(['projectAbbreviation']),
  };
  return proposalDocument as any as ProposalDocument;
};

const proposalContentUpdate = {
  _id: proposalId,
  projectAbbreviation: 'projectAbbreviationUpdate',
  status: ProposalStatus.Draft,
  applicant: {
    isDone: false,
    _id: 'applicantId',
  },
  projectResponsible: {
    isDone: false,
    content: 'projectResponsibleUpdate',
    _id: 'projectResponsible',
  },
  projectUser: {
    isDone: false,
    content: 'projectUserUpdate',
    _id: 'projectUserId',
  },
  participants: [
    {
      _id: 'participantId',
      researcher: {
        isDone: true,
        content: 'researcherUpdate',
        _id: 'researcherId',
      },
      institute: {
        isDone: false,
        content: 'instituteUpdate',
        _id: 'instituteId',
      },
    },
    {
      _id: 'participantIdAdd',
      researcher: {
        isDone: true,
        content: 'researcherUpdate',
        _id: 'researcherId',
      },
      institute: {
        isDone: false,
        content: 'instituteUpdate',
        _id: 'instituteId',
      },
    },
  ],
  someNewArray: [{ _id: 'someNewArrayId', content: 'someNewArrayContent' }],
  someNewObject: { _id: 'someNewObjectId', content: 'someNewObjectContent' },
};
const getProposalDto = () => {
  const proposalDocument = {
    ...JSON.parse(JSON.stringify(proposalContentUpdate)),
  };
  return proposalDocument as any as ProposalUpdateDto;
};

describe('merge-proposal.util', () => {
  it('should merge the proposal', () => {
    const dbItem = getProposalDocument() as any;
    const apiItem = getProposalDto();
    mergeProposal(dbItem, apiItem);
    expect(dbItem.projectAbbreviation).toEqual('projectAbbreviationUpdate');
    expect(dbItem.someNewArray).toEqual([{ _id: undefined, content: 'someNewArrayContent' }]);
    expect(dbItem.someNewObject).toEqual({ _id: 'someNewObjectId', content: 'someNewObjectContent' });
    expect(dbItem.participants.length).toEqual(2);
    expect(dbItem.applicant.isDone).toEqual(false);
  });
});
