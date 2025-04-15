import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type ResourceAndRecontactDocument = ResourceAndRecontact & Document;

@Schema({ _id: true })
export class ResourceAndRecontact {
  @Prop()
  hasEnoughResources: boolean;

  @Prop()
  isRecontactingIntended: boolean;

  @Prop()
  suppSurveyReContacting: boolean;
  @Prop()
  suppSurveyReContactingText: string;
  @Prop()
  reContactIncidental: boolean;
  @Prop()
  reContactIncidentalText: string;
  @Prop()
  urgentIncidentalReContacting: boolean;
  @Prop()
  urgentIncidentalReContactingText: string;
  _id: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const ResourceAndRecontactSchema = SchemaFactory.createForClass(ResourceAndRecontact);
