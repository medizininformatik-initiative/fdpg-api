import { ForbiddenException } from '@nestjs/common';
import { PanelQuery } from 'src/modules/proposal/enums/panel-query.enum';
import { ProposalStatus } from 'src/modules/proposal/enums/proposal-status.enum';
import { ProposalType } from 'src/modules/proposal/enums/proposal-type.enum';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { getFilterForDiz } from '../diz-filter.util';

describe('DizFilterUtil', () => {
  const mockUser: IRequestUser = {
    userId: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    email: 'diz@example.com',
    username: 'johndoe',
    email_verified: true,
    roles: [Role.DizMember],
    singleKnownRole: Role.DizMember,
    miiLocation: 'Location-A',
    isFromLocation: true,
    isKnownLocation: true,
    isInactiveLocation: false,
    assignedDataSources: [],
  };

  describe('getFilterForDiz', () => {
    describe('DizComingUp', () => {
      it('should return correct filter for DizComingUp panel', () => {
        const result = getFilterForDiz(PanelQuery.DizComingUp, mockUser);

        expect(result).toEqual({
          status: ProposalStatus.FdpgCheck,
          'userProject.addressees.desiredLocations': 'Location-A',
          'fdpgChecklist.initialViewing': true,
          'fdpgChecklist.depthCheck': true,
        });
      });
    });

    describe('DizRequested', () => {
      it('should return correct filter for DizRequested panel', () => {
        const result = getFilterForDiz(PanelQuery.DizRequested, mockUser);

        expect(result).toEqual({
          $and: [
            {
              status: {
                $in: [ProposalStatus.LocationCheck],
              },
            },
            { $or: [{ openDizChecks: 'Location-A' }, { openDizConditionChecks: 'Location-A' }] },
          ],
        });
      });
    });

    describe('DizPending', () => {
      it('should return correct filter for DizPending panel', () => {
        const result = getFilterForDiz(PanelQuery.DizPending, mockUser);

        expect(result).toEqual({
          $and: [
            {
              status: {
                $in: [ProposalStatus.LocationCheck, ProposalStatus.Contracting],
              },
            },
            { $or: [{ dizApprovedLocations: 'Location-A' }, { uacApprovedLocations: 'Location-A' }] },
          ],
        });
      });
    });

    describe('DizOngoing', () => {
      it('should return correct filter for DizOngoing panel', () => {
        const result = getFilterForDiz(PanelQuery.DizOngoing, mockUser);

        expect(result).toEqual({
          status: {
            $in: [
              ProposalStatus.Contracting,
              ProposalStatus.ExpectDataDelivery,
              ProposalStatus.DataResearch,
              ProposalStatus.FinishedProject,
              ProposalStatus.DataCorrupt,
            ],
          },
          signedContracts: 'Location-A',
        });
      });
    });

    describe('DizFinished', () => {
      it('should return correct filter for DizFinished panel', () => {
        const result = getFilterForDiz(PanelQuery.DizFinished, mockUser);

        expect(result).toEqual({
          $or: [
            { requestedButExcludedLocations: 'Location-A' },
            { status: ProposalStatus.ReadyToArchive, signedContracts: 'Location-A' },
            { status: ProposalStatus.Rejected, uacApprovedLocations: 'Location-A' },
            { status: ProposalStatus.Rejected, signedContracts: 'Location-A' },
          ],
        });
      });
    });

    describe('PublishedDraft', () => {
      it('should return correct filter for PublishedDraft panel', () => {
        const result = getFilterForDiz(PanelQuery.PublishedDraft, mockUser);

        expect(result).toEqual({
          $or: [
            { ownerId: 'user-123' },
            { participants: { $elemMatch: { 'researcher.email': 'diz@example.com' } } },
            { 'projectResponsible.researcher.email': 'diz@example.com' },
          ],
          type: ProposalType.RegisteringForm,
          'registerInfo.isInternalRegistration': { $ne: true },
          'owner.role': { $ne: Role.FdpgMember },
          status: ProposalStatus.Draft,
        });
      });
    });

    describe('PublishedPending', () => {
      it('should return correct filter for PublishedPending panel', () => {
        const result = getFilterForDiz(PanelQuery.PublishedPending, mockUser);

        expect(result).toEqual({
          $or: [
            { ownerId: 'user-123' },
            { participants: { $elemMatch: { 'researcher.email': 'diz@example.com' } } },
            { 'projectResponsible.researcher.email': 'diz@example.com' },
          ],
          type: ProposalType.RegisteringForm,
          'registerInfo.isInternalRegistration': { $ne: true },
          'owner.role': { $ne: Role.FdpgMember },
          status: { $in: [ProposalStatus.Rework, ProposalStatus.FdpgCheck, ProposalStatus.ReadyToPublish] },
        });
      });
    });

    describe('PublishedCompleted', () => {
      it('should return correct filter for PublishedCompleted panel', () => {
        const result = getFilterForDiz(PanelQuery.PublishedCompleted, mockUser);

        expect(result).toEqual({
          $or: [
            { ownerId: 'user-123' },
            { participants: { $elemMatch: { 'researcher.email': 'diz@example.com' } } },
            { 'projectResponsible.researcher.email': 'diz@example.com' },
          ],
          type: ProposalType.RegisteringForm,
          'registerInfo.isInternalRegistration': { $ne: true },
          'owner.role': { $ne: Role.FdpgMember },
          status: { $in: [ProposalStatus.Published, ProposalStatus.Rejected] },
        });
      });
    });

    describe('Archived', () => {
      it('should return correct filter for Archived panel', () => {
        const result = getFilterForDiz(PanelQuery.Archived, mockUser);

        expect(result).toEqual({
          $or: [
            {
              $and: [
                {
                  status: ProposalStatus.Archived,
                },
                {
                  $or: [
                    { requestedButExcludedLocations: 'Location-A' },
                    { uacApprovedLocations: 'Location-A' },
                    { signedContracts: 'Location-A' },
                  ],
                },
              ],
            },
            {
              $or: [
                { ownerId: 'user-123' },
                { participants: { $elemMatch: { 'researcher.email': 'diz@example.com' } } },
                { 'projectResponsible.researcher.email': 'diz@example.com' },
              ],
              type: ProposalType.RegisteringForm,
              'registerInfo.isInternalRegistration': { $ne: true },
              'owner.role': { $ne: Role.FdpgMember },
              status: ProposalStatus.Archived,
            },
          ],
        });
      });
    });

    describe('forbidden panels', () => {
      it('should throw ForbiddenException for unauthorized panel query', () => {
        expect(() => getFilterForDiz(PanelQuery.Draft, mockUser)).toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException for researcher panels', () => {
        expect(() => getFilterForDiz(PanelQuery.ResearcherPending, mockUser)).toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException for FDPG panels', () => {
        expect(() => getFilterForDiz(PanelQuery.FdpgRequestedToCheck, mockUser)).toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException for UAC panels', () => {
        expect(() => getFilterForDiz(PanelQuery.UacPending, mockUser)).toThrow(ForbiddenException);
      });
    });

    describe('different locations', () => {
      it('should use the correct user miiLocation in filters', () => {
        const userWithDifferentLocation: IRequestUser = {
          ...mockUser,
          miiLocation: 'Location-B',
        };

        const result = getFilterForDiz(PanelQuery.DizOngoing, userWithDifferentLocation);

        expect(result.signedContracts).toBe('Location-B');
      });
    });
  });
});

