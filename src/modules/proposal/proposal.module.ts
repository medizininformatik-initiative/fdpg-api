import { forwardRef, Module } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
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
import { ProposalSyncController } from './controller/proposal-sync.controller';
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
import { ProposalSyncService } from './services/proposal-sync.service';
import { AcptPluginClient } from '../app/acpt-plugin/acpt-plugin.client';
import { ProposalFormModule } from '../proposal-form/proposal-form.module';
import { LocationModule } from '../location/location.module';
import { Connection } from 'mongoose';
import { Location } from '../location/schema/location.schema';
import { ProposalDataDeliveryService } from './services/data-delivery/proposal-data-delivery.service';
import { FhirModule } from '../fhir/fhir.module';
import { ProposalDataDeliveryCrudService } from './services/data-delivery/proposal-data-delivery-crud.service';
import { ProposalDataDeliveryMappingService } from './services/data-delivery/proposal-data-delivery-mapping.service';
import { ProposalDeliveryInfoService } from './services/data-delivery/proposal-delivery-info.service';
import { ProposalSubDeliveryService } from './services/data-delivery/proposal-sub-delivery.service';
import { ProposalDataDeliverySyncService } from './services/data-delivery/proposal-data-delivery-sync.service';
import { SyncDeliveryInfoCronService } from './cron/sync-delivery-info-cron.service';
import { RegistrationFormCrudService } from './services/registration-form-crud.service';
import { RegistrationFormPublicationService } from './services/registration-form-publication.service';
import { RegistrationFormReportService } from './services/registration-form-report.service';
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
    CacheModule.register(),
    UserModule,
    forwardRef(() => EventEngineModule),
    StorageModule,
    PdfEngineModule,
    SharedModule,
    FeasibilityModule,
    FhirModule,
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
    ProposalSyncController,
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
    IsUniqueAbbreviationConstraint,
    StatusChangeService,
    ProposalPdfService,
    ProposalSyncService,
    AcptPluginClient,
    RegistrationFormCrudService,
    RegistrationFormPublicationService,
    RegistrationFormReportService,

    // Data Delivery
    ProposalDataDeliveryService,
    ProposalDataDeliveryCrudService,
    ProposalDataDeliveryMappingService,
    ProposalDeliveryInfoService,
    ProposalSubDeliveryService,
    ProposalDataDeliverySyncService,
    SyncDeliveryInfoCronService,
  ],
  exports: [ProposalCrudService, MongooseModule, ProposalSyncService],
})
export class ProposalModule {}
