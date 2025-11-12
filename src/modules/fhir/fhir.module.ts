import { Module } from '@nestjs/common';
import { FhirService } from './fhir.service';
import { FhirAuthenticationClient } from './fhir-authentication.client';
import { FhirClient } from './fhir.client';

@Module({
  imports: [],
  providers: [FhirClient, FhirService, FhirAuthenticationClient],
  exports: [FhirService],
})
export class FhirModule {}
