import { forwardRef, Module } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
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
import { ProposalDataDeliveryController } from './controller/proposal-data-delivery.controller';
import { ProposalMiscController } from './controller/proposal-misc.controller';
import { ProposalPublicationController } from './controller/proposal-publication.controller';
import { ProposalReportController } from './controller/proposal-reports.controller';
import { ProposalUploadController } from './controller/proposal-upload.controller';
import { getProposalSchemaFactory, Proposal } from './schema/proposal.schema';
import { ProposalContractingService } from './services/proposal-contracting.service';
import { ProposalCrudService } from './services/proposal-crud.service';
import { ProposalMiscService } from './services/proposal-misc.service';
import { ProposalPublicationService } from './services/proposal-publication.service';
import { ProposalReportService } from './services/proposal-report.service';
import { ProposalUploadService } from './services/proposal-upload.service';
import { ProposalDownloadService } from './services/proposal-download.service';
import { StatusChangeService } from './services/status-change.service';
import { IsUniqueAbbreviationConstraint } from './validators/is-unique-abbreviation.validator';
import { ProposalPdfService } from './services/proposal-pdf.service';
import { ProposalFormModule } from '../proposal-form/proposal-form.module';
import { LocationModule } from '../location/location.module';
import { Connection } from 'mongoose';
import { Location } from '../location/schema/location.schema';
import { ProposalDataDeliveryService } from './services/proposal-data-delivery.service';
@Module({
  imports: [
    LocationModule,
    MongooseModule.forFeatureAsync([
      {
        name: Proposal.name,
        inject: [getConnectionToken()],
        useFactory: (connection: Connection) => {
          const LocationModel = connection.model<Location>(Location.name);
          return getProposalSchemaFactory(LocationModel);
        },
      },
    ]),
    UserModule,
    forwardRef(() => EventEngineModule),
    StorageModule,
    PdfEngineModule,
    SharedModule,
    FeasibilityModule,
    SchedulerModule,
    AdminModule,
    ProposalFormModule,
  ],
  controllers: [
    ProposalCrudController,
    ProposalMiscController,
    ProposalUploadController,
    ProposalPublicationController,
    ProposalReportController,
    ProposalContractingController,
    ProposalDataDeliveryController,
  ],
  providers: [
    ProposalCrudService,
    ProposalMiscService,
    ProposalUploadService,
    ProposalDownloadService,
    ProposalPublicationService,
    ProposalReportService,
    ProposalContractingService,
    ProposalDataDeliveryService,
    IsUniqueAbbreviationConstraint,
    StatusChangeService,
    ProposalPdfService,
  ],
  exports: [ProposalCrudService, MongooseModule],
})
export class ProposalModule {}
