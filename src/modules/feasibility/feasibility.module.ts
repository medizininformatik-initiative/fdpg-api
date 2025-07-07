import { Module } from '@nestjs/common';
import { FeasibilityService } from './feasibility.service';
import { FeasibilityClient } from './feasibility.client';
import { FeasibilityController } from './feasibility.controller';
import { FeasibilityAuthenticationClient } from './feasibility-authentication.client';

@Module({
  imports: [],
  providers: [FeasibilityClient, FeasibilityService, FeasibilityAuthenticationClient],
  exports: [FeasibilityService],
  controllers: [FeasibilityController],
})
export class FeasibilityModule {}
