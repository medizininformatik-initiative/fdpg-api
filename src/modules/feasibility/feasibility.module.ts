import { Module } from '@nestjs/common';
import { FeasibilityService } from './feasibility.service';
import { FeasibilityClient } from './feasibility.client';
import { FeasibilityController } from './feasibility.controller';

@Module({
  imports: [],
  providers: [FeasibilityClient, FeasibilityService],
  exports: [FeasibilityService],
  controllers: [FeasibilityController],
})
export class FeasibilityModule {}
