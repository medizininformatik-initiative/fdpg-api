import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type ResourceAndRecontactDocument = ResourceAndRecontact & Document;

@Schema({ _id: true })
export class ResourceAndRecontact {
  @Prop()
  hasEnoughResources: boolean;

  @Prop()
  isRecontactingIntended: boolean;

  _id: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const ResourceAndRecontactSchema = SchemaFactory.createForClass(ResourceAndRecontact);
