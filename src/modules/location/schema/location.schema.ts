import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Model, Schema as MongooseSchema } from 'mongoose';

export type LocationDocument = Location & Document;

@Schema({ _id: false })
export class Location {
  @Prop({ type: String })
  _id: string;

  @Prop({ required: true, unique: true })
  externalCode: string;

  @Prop({ type: String })
  display: string;

  @Prop({ type: String })
  definition?: string;

  @Prop({ type: String })
  consortium: string;

  @Prop({ type: String })
  contract?: string;

  @Prop({ type: String })
  abbreviation?: string;

  @Prop({ type: String })
  uri?: string;

  @Prop({ type: String })
  rubrum?: string;

  @Prop({ type: Boolean, default: false })
  dataIntegrationCenter: boolean;

  @Prop({ type: Boolean, default: false })
  dataManagementCenter: boolean;

  @Prop({ type: Date })
  deprecationDate?: Date;

  @Prop({ type: Boolean, default: false })
  deprecated: boolean;

  @Prop({ type: Date })
  updated?: Date;
}

export const LocationSchema = SchemaFactory.createForClass(Location);

export const addLocationPreSaveHook = <TClass, ModelClass extends Document>(
  schema: MongooseSchema<TClass>,
  locationFields: (keyof TClass)[],
  LocationModel: Model<Location>,
): void => {
  schema.pre<ModelClass>('save', async function (next) {
    try {
      await Promise.all(
        (locationFields as string[]).map(async (field) => {
          if (!this.isModified(field)) {
            return;
          }

          const value = this.get(field);
          let idsToCheck = [];
          let expectedCount = 0;

          if (Array.isArray(value)) {
            // Exclude 'DIFE' from validation as it is a special case
            idsToCheck = value.filter((id) => id !== 'DIFE');
            expectedCount = idsToCheck.length;
          } else if (typeof value === 'string' && value.length > 0) {
            idsToCheck = [value];
            expectedCount = 1;
          }

          if (expectedCount === 0) {
            return;
          }

          if (expectedCount === 0) {
            return;
          }
          const count = await LocationModel.countDocuments({ _id: { $in: idsToCheck } });

          if (count !== expectedCount) {
            console.error(`Validation failed for field '${field}': one or more location IDs do not exist.`);
            throw new mongoose.Error.ValidationError();
          }
        }),
      );
      next();
    } catch (err) {
      next(err);
    }
  });
};
