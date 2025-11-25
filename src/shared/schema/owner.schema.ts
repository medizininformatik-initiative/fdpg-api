import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Role } from '../enums/role.enum';
import { Location } from 'src/modules/location/schema/location.schema';

export type OwnerDocument = Owner & Document;

@Schema({ _id: false })
export class Owner {
  @Prop({ type: String, immutable: true })
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

  @Prop({ type: String, ref: () => Location })
  miiLocation?: string;
}

const OwnerSchema = SchemaFactory.createForClass(Owner);

export { OwnerSchema };
