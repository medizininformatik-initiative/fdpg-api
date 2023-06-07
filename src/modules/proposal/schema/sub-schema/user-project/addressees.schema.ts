import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MiiLocation } from 'src/shared/constants/mii-locations';

export type AddresseesDocument = Addressees & Document;

@Schema({ _id: true })
export class Addressees {
  @Prop([String])
  desiredLocations: MiiLocation[];

  _id: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDone: boolean;
}

export const AddresseesSchema = SchemaFactory.createForClass(Addressees);
