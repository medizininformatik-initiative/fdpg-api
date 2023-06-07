import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type PropertyRightsDocument = PropertyRights & Document;

@Schema({ _id: true })
export class PropertyRights {
  @Prop()
  options: string;

  _id: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const PropertyRightsSchema = SchemaFactory.createForClass(PropertyRights);
