import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MiiLocation } from '../constants/mii-locations';
import { Role } from '../enums/role.enum';

export type OwnerDocument = Owner & Document;

@Schema({ _id: false })
export class Owner {
  @Prop({
    type: String,
    immutable: true,
  })
  id: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  email: string;

  @Prop()
  username?: string;

  @Prop({ type: String, enum: Role })
  role?: Role;

  @Prop()
  miiLocation?: MiiLocation;
}

export const OwnerSchema = SchemaFactory.createForClass(Owner);
