import { Exclude, Expose } from 'class-transformer';
import { ExposeId } from 'src/shared/decorators/transform/expose-id.decorator';
import { OwnerDto } from 'src/shared/dto/owner.dto';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { UploadType } from '../enums/upload-type.enum';
import { Types } from 'mongoose';
import { SupportedMimetype } from '../enums/supported-mime-type.enum';
import { getOwner } from 'src/shared/utils/get-owner.util';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class UploadGetDto {
  @ExposeId()
  _id: string;

  @Expose()
  fileName: string;

  @Expose()
  fileSize: number;

  @Expose()
  type: UploadType;

  @Expose()
  mimetype: SupportedMimetype;

  @Expose()
  createdAt: Date;

  @Expose()
  @ApiProperty({
    description:
      'Currently only delivered for reports. Please use uploads controller to get the download link for other uploads',
  })
  downloadUrl?: string;
}

export class UploadDto extends UploadGetDto {
  constructor(blobName: string, file: Express.Multer.File, type: UploadType, user: IRequestUser) {
    super();
    this._id = new Types.ObjectId().toString();
    this.fileName = file.originalname;
    this.fileSize = file.size;
    this.blobName = blobName;
    this.type = type;
    this.mimetype = file.mimetype as SupportedMimetype;
    this.owner = getOwner(user);
  }

  blobName: string;

  owner: OwnerDto;
}
