import { HttpCode, Param, Post, Request } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { Auth } from 'src/shared/decorators/auth.decorator';
import { MongoIdParamDto } from 'src/shared/dto/mongo-id-param.dto';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { ProposalSyncService, BulkSyncResults, SyncResult } from '../services/proposal-sync.service';

@ApiController('proposals', undefined, 'sync')
export class ProposalSyncController {
  constructor(private readonly proposalSyncService: ProposalSyncService) {}

  @Post('/:id/sync')
  @Auth(Role.FdpgMember)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Sync a single registering form to ACPT-Plugin (WordPress)',
    description:
      'Syncs a registering form to the external ACPT-Plugin. ' +
      'If the proposal is in ReadyToPublish status, it will be moved to Published. ' +
      'If already Published but OutOfSync, it will be re-synced.',
  })
  @ApiResponse({ status: 200, description: 'Sync completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid proposal or not a registering form' })
  @ApiResponse({ status: 403, description: 'Only FDPG members can sync proposals' })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  async syncProposal(@Param() { id }: MongoIdParamDto, @Request() { user }: FdpgRequest): Promise<SyncResult> {
    return await this.proposalSyncService.syncProposal(id, user);
  }

  @Post('/:id/retry-sync')
  @Auth(Role.FdpgMember)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Retry a failed sync',
    description: 'Retries syncing a proposal that previously failed. Retry count is tracked but not limited.',
  })
  @ApiResponse({ status: 200, description: 'Retry completed' })
  @ApiResponse({ status: 403, description: 'Only FDPG members can retry sync' })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  async retrySync(@Param() { id }: MongoIdParamDto, @Request() { user }: FdpgRequest): Promise<SyncResult> {
    return await this.proposalSyncService.retrySync(id, user);
  }

  @Post('/sync-all')
  @Auth(Role.FdpgMember)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Sync all registering forms that need syncing',
    description:
      'Syncs all proposals with status ReadyToPublish or Published+OutOfSync. ' +
      'This operation processes proposals sequentially and may take several minutes.',
  })
  @ApiResponse({ status: 200, description: 'Bulk sync completed', type: Object })
  @ApiResponse({ status: 400, description: 'No proposals to sync' })
  @ApiResponse({ status: 403, description: 'Only FDPG members can bulk sync' })
  async syncAllProposals(@Request() { user }: FdpgRequest): Promise<BulkSyncResults> {
    return await this.proposalSyncService.syncAllProposals(user);
  }
}
