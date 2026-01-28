import { ForbiddenException } from '@nestjs/common';
import { PanelQuery } from 'src/modules/proposal/enums/panel-query.enum';
import { ProposalStatus } from 'src/modules/proposal/enums/proposal-status.enum';
import { ProposalType } from 'src/modules/proposal/enums/proposal-type.enum';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { getFilterForUac } from '../uac-filter.util';

describe('UacFilterUtil', () => {
  const mockUser: IRequestUser = {
    userId: 'user-123',
    firstName: 'Alice',
    lastName: 'Brown',
    fullName: 'Alice Brown',
    email: 'uac@example.com',
    username: 'alicebrown',
    email_verified: true,
    roles: [Role.UacMember],
    singleKnownRole: Role.UacMember,
    miiLocation: 'Location-A',
    isFromLocation: true,
    isKnownLocation: true,
    isInactiveLocation: false,
    assignedDataSources: [],
  };

  describe('getFilterForUac', () => {
    describe('UacRequested', () => {
      it('should return correct filter for UacRequested panel', () => {
        const result = getFilterForUac(PanelQuery.UacRequested, mockUser);

        expect(result).toEqual({
          status: ProposalStatus.LocationCheck,
          dizApprovedLocations: 'Location-A',
        });
      });
    });

    describe('UacPending', () => {
      it('should return correct filter for UacPending panel', () => {
        const result = getFilterForUac(PanelQuery.UacPending, mockUser);

        expect(result).toEqual({
          $and: [
            {
              status: {
                $in: [ProposalStatus.LocationCheck, ProposalStatus.Contracting],
              },
            },
            {
              $or: [
                { openDizChecks: 'Location-A' },
                { openDizConditionChecks: 'Location-A' },
                { uacApprovedLocations: 'Location-A' },
              ],
            },
          ],
        });
      });
    });

    describe('UacOngoing', () => {
      it('should return correct filter for UacOngoing panel', () => {
        const result = getFilterForUac(PanelQuery.UacOngoing, mockUser);

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

    describe('UacFinished', () => {
      it('should return correct filter for UacFinished panel', () => {
        const result = getFilterForUac(PanelQuery.UacFinished, mockUser);

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
        const result = getFilterForUac(PanelQuery.PublishedDraft, mockUser);

        expect(result).toEqual({
          $or: [
            { ownerId: 'user-123' },
            { participants: { $elemMatch: { 'researcher.email': 'uac@example.com' } } },
            { 'projectResponsible.researcher.email': 'uac@example.com' },
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
        const result = getFilterForUac(PanelQuery.PublishedPending, mockUser);

        expect(result).toEqual({
          $or: [
            { ownerId: 'user-123' },
            { participants: { $elemMatch: { 'researcher.email': 'uac@example.com' } } },
            { 'projectResponsible.researcher.email': 'uac@example.com' },
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
        const result = getFilterForUac(PanelQuery.PublishedCompleted, mockUser);

        expect(result).toEqual({
          $or: [
            { ownerId: 'user-123' },
            { participants: { $elemMatch: { 'researcher.email': 'uac@example.com' } } },
            { 'projectResponsible.researcher.email': 'uac@example.com' },
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
        const result = getFilterForUac(PanelQuery.Archived, mockUser);

        expect(result).toEqual({
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
        });
      });
    });

    describe('forbidden panels', () => {
      it('should throw ForbiddenException for unauthorized panel query', () => {
        expect(() => getFilterForUac(PanelQuery.Draft, mockUser)).toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException for researcher panels', () => {
        expect(() => getFilterForUac(PanelQuery.ResearcherPending, mockUser)).toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException for FDPG panels', () => {
        expect(() => getFilterForUac(PanelQuery.FdpgRequestedToCheck, mockUser)).toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException for DIZ panels', () => {
        expect(() => getFilterForUac(PanelQuery.DizPending, mockUser)).toThrow(ForbiddenException);
      });
    });

    describe('different locations', () => {
      it('should use the correct user miiLocation in filters', () => {
        const userWithDifferentLocation: IRequestUser = {
          ...mockUser,
          miiLocation: 'Location-C',
        };

        const result = getFilterForUac(PanelQuery.UacRequested, userWithDifferentLocation);

        expect(result.dizApprovedLocations).toBe('Location-C');
      });

      it('should apply miiLocation to all location-based filters', () => {
        const userWithDifferentLocation: IRequestUser = {
          ...mockUser,
          miiLocation: 'Location-C',
        };

        const ongoingResult = getFilterForUac(PanelQuery.UacOngoing, userWithDifferentLocation);
        expect(ongoingResult.signedContracts).toBe('Location-C');

        const finishedResult = getFilterForUac(PanelQuery.UacFinished, userWithDifferentLocation);
        expect(finishedResult.$or[0]).toEqual({ requestedButExcludedLocations: 'Location-C' });
      });
    });

    describe('all allowed queries', () => {
      it('should not throw error for all allowed queries', () => {
        const allowedQueries = [
          PanelQuery.UacPending,
          PanelQuery.UacOngoing,
          PanelQuery.UacFinished,
          PanelQuery.UacRequested,
          PanelQuery.PublishedDraft,
          PanelQuery.PublishedPending,
          PanelQuery.PublishedCompleted,
          PanelQuery.Archived,
        ];

        allowedQueries.forEach((query) => {
          expect(() => getFilterForUac(query, mockUser)).not.toThrow();
        });
      });
    });

    describe('filter structure', () => {
      it('should return filter with $and and $or operators for UacPending', () => {
        const result = getFilterForUac(PanelQuery.UacPending, mockUser);

        expect(result).toHaveProperty('$and');
        expect(Array.isArray(result.$and)).toBe(true);
        expect(result.$and[1]).toHaveProperty('$or');
        expect(Array.isArray(result.$and[1].$or)).toBe(true);
        expect(result.$and[1].$or).toHaveLength(3);
      });

      it('should return filter with $or operator for UacFinished', () => {
        const result = getFilterForUac(PanelQuery.UacFinished, mockUser);

        expect(result).toHaveProperty('$or');
        expect(Array.isArray(result.$or)).toBe(true);
        expect(result.$or).toHaveLength(4);
      });
    });
  });
});

