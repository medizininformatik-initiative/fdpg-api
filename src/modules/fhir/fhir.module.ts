import { Module } from '@nestjs/common';
import { FhirService } from './fhir.service';
import { FhirAuthenticationClient } from './fhir-authentication.client';
import { FhirClient } from './fhir.client';
import { LocationModule } from '../location/location.module';
import { DsfQuestionnaireResponseService } from './dsf-questionnaire-response/dsf-questionnaire-response.service';
import { DsfTaskService } from './dsf-task/dsf-task.service';

@Module({
  imports: [LocationModule],
  providers: [FhirClient, FhirService, FhirAuthenticationClient, DsfQuestionnaireResponseService, DsfTaskService],
  exports: [FhirService],
})
export class FhirModule {}
