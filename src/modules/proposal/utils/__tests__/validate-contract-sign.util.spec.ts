import { IRequestUser } from 'src/shared/types/request-user.interface';
import { Proposal } from '../../schema/proposal.schema';
import { SignContractDto } from '../../dto/sign-contract.dto';
import { Role } from 'src/shared/enums/role.enum';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { validateContractSign } from '../validate-contract-sign.util';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { ValidationErrorInfo } from 'src/shared/dto/validation/validation-error-info.dto';
import { ForbiddenException } from '@nestjs/common';
import { BadRequestError } from 'src/shared/enums/bad-request-error.enum';

describe('validateContractSign', () => {
  let baseProposal: Proposal;
  let researcherUser: IRequestUser;
  let dizUser: IRequestUser;
  let otherUser: IRequestUser;
  let validFile: Express.Multer.File;
  let voteTrue: SignContractDto;
  let voteFalse: SignContractDto;

  beforeEach(() => {
    // Minimal proposal object
    baseProposal = {
      status: ProposalStatus.Draft,
      contractAcceptedByResearcher: false,
      contractRejectedByResearcher: false,
      uacApprovedLocations: [],
      signedContracts: [],
    } as unknown as Proposal;

    researcherUser = {
      singleKnownRole: Role.Researcher,
      userId: 'r1',
      email: 'res@example.com',
    } as IRequestUser;

    dizUser = {
      singleKnownRole: Role.DizMember,
      userId: 'd1',
      email: 'diz@example.com',
      miiLocation: MiiLocation.UKL,
    } as IRequestUser;

    otherUser = {
      singleKnownRole: Role.FdpgMember,
      userId: 'f1',
      email: 'fdpg@example.com',
    } as IRequestUser;

    validFile = {
      buffer: Buffer.from('pdf-contents'),
      originalname: 'contract.pdf',
      mimetype: 'application/pdf',
      size: 1234,
      fieldname: 'file',
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    } as Express.Multer.File;

    voteTrue = { value: true } as SignContractDto;
    voteFalse = { value: false } as SignContractDto;
  });

  describe('when vote.value === true and no file provided', () => {
    it('throws ValidationException with "No Contract attached"', () => {
      expect(() => validateContractSign(baseProposal, researcherUser, voteTrue, undefined)).toThrow(
        ValidationException,
      );

      try {
        validateContractSign(baseProposal, researcherUser, voteTrue, undefined);
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationException);
        const ve = err as ValidationException;
        expect(ve.validationErrors).toHaveLength(1);
        const info = ve.validationErrors[0] as ValidationErrorInfo;
        expect(info.constraint).toBe('hasContract');
        expect(info.message).toBe('No Contract attached');
        expect(info.property).toBe('file');
        expect(info.code).toBe(BadRequestError.ContractSignNoContract);
      }
    });
  });

  describe('when proposal.status !== Contracting', () => {
    it('throws ForbiddenException "The current status does not allow to sign contracts"', () => {
      baseProposal.status = ProposalStatus.Rejected;
      expect(() => validateContractSign(baseProposal, researcherUser, voteFalse, validFile)).toThrow(
        ForbiddenException,
      );
      expect(() =>
        validateContractSign({ ...baseProposal, status: ProposalStatus.Draft }, dizUser, voteTrue, validFile),
      ).toThrow('The current status does not allow to sign contracts');
    });
  });

  describe('Researcher-specific validation', () => {
    beforeEach(() => {
      baseProposal.status = ProposalStatus.Contracting;
    });

    it('allows researcher when no prior decision and vote=true with file', () => {
      expect(() => validateContractSign(baseProposal, researcherUser, voteTrue, validFile)).not.toThrow();
    });

    it('allows researcher when no prior decision and vote=false', () => {
      expect(() => validateContractSign(baseProposal, researcherUser, voteFalse, undefined)).not.toThrow();
    });

    it('throws ForbiddenException "The researcher contract is already signed" if already decided', () => {
      baseProposal.contractAcceptedByResearcher = true;
      expect(() => validateContractSign(baseProposal, researcherUser, voteFalse, undefined)).toThrow(
        'The researcher contract is already signed',
      );
      baseProposal.contractAcceptedByResearcher = false;
      baseProposal.contractRejectedByResearcher = true;
      expect(() => validateContractSign(baseProposal, researcherUser, voteTrue, validFile)).toThrow(
        'The researcher contract is already signed',
      );
    });
  });

  describe('DizMember-specific validation', () => {
    beforeEach(() => {
      baseProposal.status = ProposalStatus.Contracting;
      // Simulate researcher signed
      baseProposal.contractAcceptedByResearcher = true;
    });

    it('throws ForbiddenException "The researcher has not signed the contract yet" if researcher decision missing', () => {
      baseProposal.contractAcceptedByResearcher = false;
      baseProposal.contractRejectedByResearcher = false;
      expect(() => validateContractSign(baseProposal, dizUser, voteFalse, undefined)).toThrow(
        'The researcher has not signed the contract yet',
      );
    });

    it('throws if location not in uacApprovedLocations', () => {
      expect(() => validateContractSign(baseProposal, dizUser, voteTrue, validFile)).toThrow(
        'The contract could not be signed. The location might be not valid to sign or already did',
      );
    });

    it('throws if location already in signedContracts', () => {
      baseProposal.uacApprovedLocations = [MiiLocation.BHC];
      baseProposal.signedContracts = [MiiLocation.BHC];
      expect(() => validateContractSign(baseProposal, dizUser, voteFalse, undefined)).toThrow(
        'The contract could not be signed. The location might be not valid to sign or already did',
      );
    });

    it('allows if location in uacApprovedLocations and not yet signed', () => {
      baseProposal.uacApprovedLocations = [MiiLocation.UKL];
      baseProposal.signedContracts = [];
      expect(() => validateContractSign(baseProposal, dizUser, voteTrue, validFile)).not.toThrow();
    });
  });

  describe('non-Researcher, non-DizMember role', () => {
    beforeEach(() => {
      baseProposal.status = ProposalStatus.Contracting;
    });

    it('throws generic ForbiddenException for unsupported role', () => {
      expect(() => validateContractSign(baseProposal, otherUser, voteFalse, undefined)).toThrow(ForbiddenException);
    });
  });
});
