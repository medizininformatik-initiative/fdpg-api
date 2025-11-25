import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Location } from 'src/modules/location/schema/location.schema';

export type AddresseesDocument = Addressees & Document;

@Schema({ _id: true })
export class Addressees {
  @Prop({ type: [String], ref: () => Location })
  desiredLocations: string[];

  _id: string;

  @Prop({ type: Boolean, default: false })
  isDone: boolean;
}

const AddresseesSchema = SchemaFactory.createForClass(Addressees);

export { AddresseesSchema };
