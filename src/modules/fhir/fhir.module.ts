import { Module } from '@nestjs/common';
import { FhirService } from './fhir.service';
import { FhirAuthenticationClient } from './fhir-authentication.client';
import { FhirClient } from './fhir.client';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [LocationModule],
  providers: [FhirClient, FhirService, FhirAuthenticationClient],
  exports: [FhirService],
})
export class FhirModule {}
