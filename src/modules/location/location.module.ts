import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocationGroup, LocationGroupSchema } from './schema/location-group.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: LocationGroup.name,
        schema: LocationGroupSchema,
      },
    ]),
  ],
})
export class LocationGroupModule {}
