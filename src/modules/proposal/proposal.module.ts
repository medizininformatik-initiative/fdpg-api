import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SharedModule } from 'src/shared/shared.module';
import { AdminModule } from '../admin/admin.module';
import { StorageModule } from '../storage/storage.module';
import { EventEngineModule } from '../event-engine/event-engine.module';
import { FeasibilityModule } from '../feasibility/feasibility.module';
import { PdfEngineModule } from '../pdf-engine/pdf-engine.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { UserModule } from '../user/user.module';
import { ProposalContractingController } from './controller/proposal-contracting.controller';
import { ProposalCrudController } from './controller/proposal-crud.controller';
import { ProposalMiscController } from './controller/proposal-misc.controller';
import { ProposalPublicationController } from './controller/proposal-publication.controller';
import { ProposalReportController } from './controller/proposal-reports.controller';
import { ProposalUploadController } from './controller/proposal-upload.controller';
import { Proposal, ProposalSchema } from './schema/proposal.schema';
import { ProposalContractingService } from './services/proposal-contracting.service';
import { ProposalCrudService } from './services/proposal-crud.service';
import { ProposalMiscService } from './services/proposal-misc.service';
import { ProposalPublicationService } from './services/proposal-publication.service';
import { ProposalReportService } from './services/proposal-report.service';
import { ProposalUploadService } from './services/proposal-upload.service';
import { StatusChangeService } from './services/status-change.service';
import { IsUniqueAbbreviationConstraint } from './validators/is-unique-abbreviation.validator';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CHECKLIST_OPTIONS } from './dto/proposal/checklist.types';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Proposal.name,
        schema: ProposalSchema,
      },
    ]),
    UserModule,
    EventEngineModule,
    StorageModule,
    PdfEngineModule,
    SharedModule,
    FeasibilityModule,
    SchedulerModule,
    AdminModule,
  ],
  controllers: [
    ProposalCrudController,
    ProposalMiscController,
    ProposalUploadController,
    ProposalPublicationController,
    ProposalReportController,
    ProposalContractingController,
  ],
  providers: [
    ProposalCrudService,
    ProposalMiscService,
    ProposalUploadService,
    ProposalPublicationService,
    ProposalReportService,
    ProposalContractingService,
    IsUniqueAbbreviationConstraint,
    StatusChangeService,
  ],
  exports: [ProposalCrudService],
})
export class ProposalModule implements OnModuleInit {
  constructor(@InjectModel(Proposal.name) private proposalModel: Model<Proposal>) {}

  async onModuleInit() {
    // Migration: Update existing proposals to include the TNZ option in their checklists
    // This is a one-time migration to ensure all existing proposals have the TNZ option in their checklists
    // and can be removed after all proposals have been updated.
    await this.migrateChecklistsToIncludeTNZ();
  }

  private async migrateChecklistsToIncludeTNZ() {
    try {
      const proposals = await this.proposalModel.find({}).exec();

      for (const proposal of proposals) {
        if (!proposal.fdpgChecklist) continue;

        let updated = false;

        if (proposal.fdpgChecklist.checkListVerification) {
          this.updateChecklistItems(proposal.fdpgChecklist.checkListVerification);
          updated = true;
        }

        if (proposal.fdpgChecklist.projectProperties) {
          this.updateChecklistItems(proposal.fdpgChecklist.projectProperties);
          updated = true;
        }

        if (updated) {
          await proposal.save();
        }
      }

      console.log('Migration completed: All proposal checklists updated to include TNZ option');
    } catch (error) {
      console.error('Error during checklist migration:', error);
    }
  }

  private updateChecklistItems(items: any[]) {
    for (const item of items) {
      if (
        (item.options &&
          item.options.length === 2 &&
          item.options.some((opt) => opt.optionValue === 'yes') &&
          item.options.some((opt) => opt.optionValue === 'no')) ||
        (item.options && item.options.length === 1 && item.options.some((opt) => opt.optionValue === 'yes'))
      ) {
        if (!item.options.some((opt) => opt.optionValue === 'TNZ')) {
          item.options = CHECKLIST_OPTIONS.YES_NO_TNZ;
        }
      }

      if (item.sublist && item.sublist.length > 0) {
        this.updateChecklistItems(item.sublist);
      }
    }
  }
}
