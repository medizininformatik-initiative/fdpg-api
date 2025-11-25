import { Module } from '@nestjs/common';
import { FhirService } from './fhir.service';
import { FhirAuthenticationClient } from './fhir-authentication.client';
import { FhirClient } from './fhir.client';
import { LocationModule } from '../location/location.module';
import { FhirTaskCoordinateSharingPayloadFactory } from './factory/fhir-task-coordinate-sharing-payload.factory';

@Module({
  imports: [LocationModule],
  providers: [FhirClient, FhirService, FhirAuthenticationClient, FhirTaskCoordinateSharingPayloadFactory],
  exports: [FhirService],
})
export class FhirModule {}
