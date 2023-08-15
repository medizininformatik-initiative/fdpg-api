import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AzureStorageService } from 'src/modules/azure-storage/azure-storage.service';
import { Comment, CommentDocument } from 'src/modules/comment/schema/comment.schema';
import { ProposalDocument } from 'src/modules/proposal/schema/proposal.schema';
import { SchedulerService } from 'src/modules/scheduler/scheduler.service';
import { IRequestUser } from './types/request-user.interface';
import { validateProposalDeletion } from './utils/validate-proposal-deletion.util';

@Injectable()
export class SharedService {
  constructor(
    @InjectModel(Comment.name)
    private commentModel: Model<CommentDocument>,
    private azureStorageService: AzureStorageService,
    private schedulerService: SchedulerService,
  ) {}

  async deleteProposalWithDependencies(proposal: ProposalDocument, user: IRequestUser): Promise<void> {
    validateProposalDeletion(proposal, user);

    const uploadBlobs = proposal.uploads?.map((upload) => upload.blobName);

    const reportUploadBlobs = proposal.reports?.reduce((acc, report) => {
      const uploadBlobs = report.uploads.map((upload) => upload.blobName);
      acc.push(...uploadBlobs);
      return acc;
    }, [] as string[]);

    const allBlobs = [...uploadBlobs, ...reportUploadBlobs];

    if (allBlobs && allBlobs.length > 0) {
      await this.azureStorageService.deleteManyBlobs(allBlobs);
    }

    await this.commentModel.deleteMany({ referenceDocumentId: proposal._id });
    await this.schedulerService.cancelEventsForProposal(proposal);

    await proposal.deleteOne();
  }
}
