import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEngineModule } from '../event-engine/event-engine.module';
import { ScheduleEventHandlerService } from './schedule-event-handler.service';
import { ScheduleProcessorService } from './schedule-processor.service';
import { SchedulerService } from './scheduler.service';
import { Schedule, ScheduleSchema } from './schema/schedule.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Schedule.name,
        schema: ScheduleSchema,
      },
    ]),
    EventEngineModule,
  ],
  providers: [ScheduleProcessorService, SchedulerService, ScheduleEventHandlerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
