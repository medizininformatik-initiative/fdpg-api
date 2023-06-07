import { Expose } from 'class-transformer';
import { Readable } from 'stream';

@Expose()
export class FileDto implements Express.Multer.File {
  @Expose()
  fieldname: string;
  @Expose()
  originalname: string;
  @Expose()
  encoding: string;
  @Expose()
  mimetype: string;
  @Expose()
  buffer: Buffer;
  @Expose()
  size: number;
  @Expose()
  stream: Readable;
  @Expose()
  destination: string;
  @Expose()
  filename: string;
  @Expose()
  path: string;
}
