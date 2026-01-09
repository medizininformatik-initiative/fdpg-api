import { ForbiddenException } from '@nestjs/common';
import { PanelQuery } from 'src/modules/proposal/enums/panel-query.enum';
import { ProposalStatus } from 'src/modules/proposal/enums/proposal-status.enum';
import { ProposalType } from 'src/modules/proposal/enums/proposal-type.enum';
import { SyncStatus } from 'src/modules/proposal/enums/sync-status.enum';
import { Role } from 'src/shared/enums/role.enum';
import { getFilterForFdpg } from '../fdpg-filter.util';

describe('FdpgFilterUtil', () => {
  describe('getFilterForFdpg', () => {
    describe('FdpgRequestedToCheck', () => {
      it('should return correct filter for FdpgRequestedToCheck panel', () => {
        const result = getFilterForFdpg(PanelQuery.FdpgRequestedToCheck);

        expect(result).toEqual({
          status: ProposalStatus.FdpgCheck,
          type: ProposalType.ApplicationForm,
        });
      });
    });

    describe('FdpgRequestedInWork', () => {
      it('should return correct filter for FdpgRequestedInWork panel', () => {
        const result = getFilterForFdpg(PanelQuery.FdpgRequestedInWork);

        expect(result).toEqual({
          status: ProposalStatus.Rework,
          type: ProposalType.ApplicationForm,
        });
      });
    });

    describe('FdpgPendingToCheck', () => {
      it('should return correct filter for FdpgPendingToCheck panel', () => {
        const result = getFilterForFdpg(PanelQuery.FdpgPendingToCheck);

        expect(result).toEqual({
          status: { $in: [ProposalStatus.LocationCheck, ProposalStatus.Contracting] },
          openFdpgTasksCount: { $gt: 0 },
          type: ProposalType.ApplicationForm,
        });
      });
    });

    describe('FdpgPendingInWork', () => {
      it('should return correct filter for FdpgPendingInWork panel', () => {
        const result = getFilterForFdpg(PanelQuery.FdpgPendingInWork);

        expect(result).toEqual({
          status: { $in: [ProposalStatus.LocationCheck, ProposalStatus.Contracting] },
          openFdpgTasksCount: 0,
          type: ProposalType.ApplicationForm,
        });
      });
    });

    describe('FdpgOngoingToCheck', () => {
      it('should return correct filter for FdpgOngoingToCheck panel', () => {
        const result = getFilterForFdpg(PanelQuery.FdpgOngoingToCheck);

        expect(result).toEqual({
          status: { $in: [ProposalStatus.FinishedProject, ProposalStatus.DataCorrupt] },
          type: ProposalType.ApplicationForm,
        });
      });
    });

    describe('FdpgOngoingInWork', () => {
      it('should return correct filter for FdpgOngoingInWork panel', () => {
        const result = getFilterForFdpg(PanelQuery.FdpgOngoingInWork);

        expect(result).toEqual({
          status: { $in: [ProposalStatus.ExpectDataDelivery, ProposalStatus.DataResearch] },
          type: ProposalType.ApplicationForm,
        });
      });
    });

    describe('FdpgFinished', () => {
      it('should return correct filter for FdpgFinished panel', () => {
        const result = getFilterForFdpg(PanelQuery.FdpgFinished);

        expect(result).toEqual({
          status: { $in: [ProposalStatus.Rejected, ProposalStatus.ReadyToArchive] },
          type: ProposalType.ApplicationForm,
        });
      });
    });

    describe('FdpgPublishedRequested', () => {
      it('should return correct filter for FdpgPublishedRequested panel', () => {
        const result = getFilterForFdpg(PanelQuery.FdpgPublishedRequested);

        expect(result).toEqual({
          type: ProposalType.RegisteringForm,
          status: ProposalStatus.FdpgCheck,
        });
      });
    });

    describe('FdpgPublishedReady', () => {
      it('should return correct filter for FdpgPublishedReady panel', () => {
        const result = getFilterForFdpg(PanelQuery.FdpgPublishedReady);

        expect(result).toEqual({
          type: ProposalType.RegisteringForm,
          status: ProposalStatus.Published,
          'registerInfo.syncStatus': {
            $in: [SyncStatus.OutOfSync, SyncStatus.SyncFailed, SyncStatus.Syncing, SyncStatus.NotSynced],
          },
        });
      });
    });

    describe('FdpgPublishedPublished', () => {
      it('should return correct filter for FdpgPublishedPublished panel', () => {
        const result = getFilterForFdpg(PanelQuery.FdpgPublishedPublished);

        expect(result).toEqual({
          type: ProposalType.RegisteringForm,
          status: ProposalStatus.Published,
          'registerInfo.syncStatus': SyncStatus.Synced,
        });
      });
    });

    describe('FdpgPublishedDraft', () => {
      it('should return correct filter for FdpgPublishedDraft panel', () => {
        const result = getFilterForFdpg(PanelQuery.FdpgPublishedDraft);

        expect(result).toEqual({
          type: ProposalType.RegisteringForm,
          status: ProposalStatus.Draft,
          $or: [{ 'registerInfo.isInternalRegistration': true }, { 'owner.role': Role.FdpgMember }],
        });
      });
    });

    describe('Archived', () => {
      it('should return correct filter for Archived panel', () => {
        const result = getFilterForFdpg(PanelQuery.Archived);

        expect(result).toEqual({
          status: ProposalStatus.Archived,
        });
      });
    });

    describe('FdpgOverview', () => {
      it('should return correct filter for FdpgOverview panel', () => {
        const result = getFilterForFdpg(PanelQuery.FdpgOverview);

        expect(result).toEqual({
          status: {
            $in: [
              ProposalStatus.FdpgCheck,
              ProposalStatus.LocationCheck,
              ProposalStatus.Contracting,
              ProposalStatus.ExpectDataDelivery,
              ProposalStatus.DataResearch,
              ProposalStatus.DataCorrupt,
              ProposalStatus.FinishedProject,
              ProposalStatus.ReadyToArchive,
            ],
          },
          type: ProposalType.ApplicationForm,
        });
      });
    });

    describe('forbidden panels', () => {
      it('should throw ForbiddenException for unauthorized panel query', () => {
        expect(() => getFilterForFdpg(PanelQuery.Draft)).toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException for researcher panels', () => {
        expect(() => getFilterForFdpg(PanelQuery.ResearcherPending)).toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException for DIZ panels', () => {
        expect(() => getFilterForFdpg(PanelQuery.DizPending)).toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException for UAC panels', () => {
        expect(() => getFilterForFdpg(PanelQuery.UacPending)).toThrow(ForbiddenException);
      });
    });

    describe('all allowed queries', () => {
      it('should not throw error for all allowed queries', () => {
        const allowedQueries = [
          PanelQuery.FdpgRequestedToCheck,
          PanelQuery.FdpgRequestedInWork,
          PanelQuery.FdpgPendingToCheck,
          PanelQuery.FdpgPendingInWork,
          PanelQuery.FdpgOngoingToCheck,
          PanelQuery.FdpgOngoingInWork,
          PanelQuery.FdpgFinished,
          PanelQuery.FdpgPublishedRequested,
          PanelQuery.FdpgPublishedReady,
          PanelQuery.FdpgPublishedPublished,
          PanelQuery.FdpgPublishedDraft,
          PanelQuery.Archived,
          PanelQuery.FdpgOverview,
        ];

        allowedQueries.forEach((query) => {
          expect(() => getFilterForFdpg(query)).not.toThrow();
        });
      });
    });
  });
});

