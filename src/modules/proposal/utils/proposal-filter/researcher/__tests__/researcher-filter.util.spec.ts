import { ForbiddenException } from '@nestjs/common';
import { PanelQuery } from 'src/modules/proposal/enums/panel-query.enum';
import { ProposalStatus } from 'src/modules/proposal/enums/proposal-status.enum';
import { ProposalType } from 'src/modules/proposal/enums/proposal-type.enum';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { getFilterForResearcher } from '../researcher-filter.util';

describe('ResearcherFilterUtil', () => {
  const mockUser: IRequestUser = {
    userId: 'user-123',
    firstName: 'Jane',
    lastName: 'Smith',
    fullName: 'Jane Smith',
    email: 'researcher@example.com',
    username: 'janesmith',
    email_verified: true,
    roles: [Role.Researcher],
    singleKnownRole: Role.Researcher,
    miiLocation: 'Location-A',
    isFromLocation: false,
    isKnownLocation: true,
    isInactiveLocation: false,
    assignedDataSources: [],
  };

  describe('getFilterForResearcher', () => {
    describe('Draft', () => {
      it('should return correct filter for Draft panel', () => {
        const result = getFilterForResearcher(PanelQuery.Draft, mockUser);

        expect(result).toEqual({
          $or: [
            { ownerId: 'user-123' },
            { participants: { $elemMatch: { 'researcher.email': 'researcher@example.com' } } },
            { 'projectResponsible.researcher.email': 'researcher@example.com' },
          ],
          status: ProposalStatus.Draft,
          type: { $eq: ProposalType.ApplicationForm },
        });
      });
    });

    describe('ResearcherPending', () => {
      it('should return correct filter for ResearcherPending panel', () => {
        const result = getFilterForResearcher(PanelQuery.ResearcherPending, mockUser);

        expect(result).toEqual({
          $or: [
            { ownerId: 'user-123' },
            { participants: { $elemMatch: { 'researcher.email': 'researcher@example.com' } } },
            { 'projectResponsible.researcher.email': 'researcher@example.com' },
          ],
          status: {
            $in: [
              ProposalStatus.FdpgCheck,
              ProposalStatus.Rework,
              ProposalStatus.LocationCheck,
              ProposalStatus.Contracting,
            ],
          },
          type: { $eq: ProposalType.ApplicationForm },
        });
      });
    });

    describe('ResearcherOngoing', () => {
      it('should return correct filter for ResearcherOngoing panel', () => {
        const result = getFilterForResearcher(PanelQuery.ResearcherOngoing, mockUser);

        expect(result).toEqual({
          $or: [
            { ownerId: 'user-123' },
            { participants: { $elemMatch: { 'researcher.email': 'researcher@example.com' } } },
            { 'projectResponsible.researcher.email': 'researcher@example.com' },
          ],
          status: {
            $in: [
              ProposalStatus.ExpectDataDelivery,
              ProposalStatus.DataResearch,
              ProposalStatus.FinishedProject,
              ProposalStatus.DataCorrupt,
            ],
          },
          type: { $eq: ProposalType.ApplicationForm },
        });
      });
    });

    describe('ResearcherFinished', () => {
      it('should return correct filter for ResearcherFinished panel', () => {
        const result = getFilterForResearcher(PanelQuery.ResearcherFinished, mockUser);

        expect(result).toEqual({
          $or: [
            { ownerId: 'user-123' },
            { participants: { $elemMatch: { 'researcher.email': 'researcher@example.com' } } },
            { 'projectResponsible.researcher.email': 'researcher@example.com' },
          ],
          status: { $in: [ProposalStatus.Rejected, ProposalStatus.ReadyToArchive] },
          type: { $eq: ProposalType.ApplicationForm },
        });
      });
    });

    describe('Archived', () => {
      it('should return correct filter for Archived panel without type filter', () => {
        const result = getFilterForResearcher(PanelQuery.Archived, mockUser);

        expect(result).toEqual({
          $or: [
            { ownerId: 'user-123' },
            { participants: { $elemMatch: { 'researcher.email': 'researcher@example.com' } } },
            { 'projectResponsible.researcher.email': 'researcher@example.com' },
          ],
          status: ProposalStatus.Archived,
        });

        // Verify that type filter is NOT present for Archived
        expect((result as any).type).toBeUndefined();
      });
    });

    describe('PublishedDraft', () => {
      it('should return correct filter for PublishedDraft panel', () => {
        const result = getFilterForResearcher(PanelQuery.PublishedDraft, mockUser);

        expect(result).toEqual({
          $or: [
            { ownerId: 'user-123' },
            { participants: { $elemMatch: { 'researcher.email': 'researcher@example.com' } } },
            { 'projectResponsible.researcher.email': 'researcher@example.com' },
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
        const result = getFilterForResearcher(PanelQuery.PublishedPending, mockUser);

        expect(result).toEqual({
          $or: [
            { ownerId: 'user-123' },
            { participants: { $elemMatch: { 'researcher.email': 'researcher@example.com' } } },
            { 'projectResponsible.researcher.email': 'researcher@example.com' },
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
        const result = getFilterForResearcher(PanelQuery.PublishedCompleted, mockUser);

        expect(result).toEqual({
          $or: [
            { ownerId: 'user-123' },
            { participants: { $elemMatch: { 'researcher.email': 'researcher@example.com' } } },
            { 'projectResponsible.researcher.email': 'researcher@example.com' },
          ],
          type: ProposalType.RegisteringForm,
          'registerInfo.isInternalRegistration': { $ne: true },
          'owner.role': { $ne: Role.FdpgMember },
          status: { $in: [ProposalStatus.Published, ProposalStatus.Rejected] },
        });
      });
    });

    describe('forbidden panels', () => {
      it('should throw ForbiddenException for unauthorized panel query', () => {
        expect(() => getFilterForResearcher(PanelQuery.FdpgRequestedToCheck, mockUser)).toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException for DIZ panels', () => {
        expect(() => getFilterForResearcher(PanelQuery.DizPending, mockUser)).toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException for UAC panels', () => {
        expect(() => getFilterForResearcher(PanelQuery.UacPending, mockUser)).toThrow(ForbiddenException);
      });
    });

    describe('different users', () => {
      it('should use the correct user email and userId in filters', () => {
        const differentUser: IRequestUser = {
          userId: 'user-456',
          firstName: 'Bob',
          lastName: 'Jones',
          fullName: 'Bob Jones',
          email: 'different@example.com',
          username: 'bobjones',
          email_verified: true,
          roles: [Role.Researcher],
          singleKnownRole: Role.Researcher,
          miiLocation: 'Location-B',
          isFromLocation: false,
          isKnownLocation: true,
          isInactiveLocation: false,
          assignedDataSources: [],
        };

        const result = getFilterForResearcher(PanelQuery.Draft, differentUser);

        expect(result.$or).toEqual([
          { ownerId: 'user-456' },
          { participants: { $elemMatch: { 'researcher.email': 'different@example.com' } } },
          { 'projectResponsible.researcher.email': 'different@example.com' },
        ]);
      });
    });

    describe('type filter handling', () => {
      it('should include type filter for non-Archived panels', () => {
        const result = getFilterForResearcher(PanelQuery.Draft, mockUser);
        expect((result as any).type).toEqual({ $eq: ProposalType.ApplicationForm });
      });

      it('should NOT include type filter for Archived panel', () => {
        const result = getFilterForResearcher(PanelQuery.Archived, mockUser);
        expect((result as any).type).toBeUndefined();
      });

      it('should include RegisteringForm type for Published panels', () => {
        const result = getFilterForResearcher(PanelQuery.PublishedDraft, mockUser);
        expect((result as any).type).toEqual(ProposalType.RegisteringForm);
      });
    });

    describe('all allowed queries', () => {
      it('should not throw error for all allowed queries', () => {
        const allowedQueries = [
          PanelQuery.Draft,
          PanelQuery.ResearcherPending,
          PanelQuery.ResearcherOngoing,
          PanelQuery.ResearcherFinished,
          PanelQuery.PublishedDraft,
          PanelQuery.PublishedPending,
          PanelQuery.PublishedCompleted,
          PanelQuery.Archived,
        ];

        allowedQueries.forEach((query) => {
          expect(() => getFilterForResearcher(query, mockUser)).not.toThrow();
        });
      });
    });
  });
});

