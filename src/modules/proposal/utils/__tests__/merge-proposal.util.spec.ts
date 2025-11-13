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

  it('should preserve nested object _id when source DTO does not include it', () => {
    // This simulates the real scenario where WithIdForObjectDto strips _id during input
    const dbItem = {
      _id: 'proposalId',
      status: ProposalStatus.Draft,
      version: { minor: 0, mayor: 0 },
      userProject: {
        ethicVote: {
          _id: 'ethicVoteId123',
          isExisting: true,
          ethicsCommittee: 'Original Committee',
        },
        projectDetails: {
          _id: 'projectDetailsId456',
          materialAndMethods: 'Original methods',
        },
        typeOfUse: {
          _id: 'typeOfUseId789',
          usage: ['RESEARCH'],
        },
      },
      modifiedPaths: jest.fn().mockReturnValue(['userProject']),
    } as any as ProposalDocument;

    const apiItem = {
      _id: 'proposalId',
      status: ProposalStatus.Draft,
      userProject: {
        ethicVote: {
          isExisting: true,
          ethicsCommittee: 'Updated Committee',
        },
        projectDetails: {
          materialAndMethods: 'Updated methods',
        },
        typeOfUse: {
          usage: ['RESEARCH', 'EDUCATION'],
        },
      },
    } as any as ProposalUpdateDto;

    mergeProposal(dbItem, apiItem);

    // The _id should be preserved from the database object
    expect(dbItem.userProject.ethicVote._id).toEqual('ethicVoteId123');
    expect(dbItem.userProject.projectDetails._id).toEqual('projectDetailsId456');
    expect(dbItem.userProject.typeOfUse._id).toEqual('typeOfUseId789');

    // The content should be updated
    expect(dbItem.userProject.ethicVote.ethicsCommittee).toEqual('Updated Committee');
    expect(dbItem.userProject.projectDetails.materialAndMethods).toEqual('Updated methods');
    expect(dbItem.userProject.typeOfUse.usage).toEqual(['RESEARCH', 'EDUCATION']);
  });

  it('should handle deeply nested objects with _id preservation', () => {
    const dbItem = {
      _id: 'proposalId',
      status: ProposalStatus.Draft,
      version: { minor: 0, mayor: 0 },
      requestedData: {
        _id: 'requestedDataId999',
        patientInfo: 'Original patient info',
        dataInfo: 'Original data info',
      },
      modifiedPaths: jest.fn().mockReturnValue(['requestedData']),
    } as any as ProposalDocument;

    const apiItem = {
      _id: 'proposalId',
      status: ProposalStatus.Draft,
      requestedData: {
        // No _id here!
        patientInfo: 'Updated patient info',
        dataInfo: 'Updated data info',
      },
    } as any as ProposalUpdateDto;

    mergeProposal(dbItem, apiItem);

    expect(dbItem.requestedData._id).toEqual('requestedDataId999');
    expect(dbItem.requestedData.patientInfo).toEqual('Updated patient info');
    expect(dbItem.requestedData.dataInfo).toEqual('Updated data info');
  });
});
