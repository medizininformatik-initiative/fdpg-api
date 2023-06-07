import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Owner, OwnerSchema } from 'src/shared/schema/owner.schema';
import { SupportedMimetype } from '../../enums/supported-mime-type.enum';
import { UploadType } from '../../enums/upload-type.enum';

export type UploadDocument = Upload & Document;

@Schema({ _id: true })
export class Upload {
  _id: string;

  @Prop()
  fileName: string;

  @Prop()
  fileSize: number;

  @Prop()
  blobName: string;

  @Prop(String)
  type: UploadType;

  @Prop(String)
  mimetype: SupportedMimetype;

  @Prop({ type: OwnerSchema })
  owner: Owner;

  @Prop({
    type: Date,
    default: Date.now,
    immutable: true,
  })
  createdAt: Date;
}

export const UploadSchema = SchemaFactory.createForClass(Upload);
