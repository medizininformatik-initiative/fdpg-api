import { Exclude, Expose, Type } from 'class-transformer';
import { ArrayUnique, IsEnum } from 'class-validator';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { ExposeId } from 'src/shared/decorators/transform/expose-id.decorator';
import { VersionDto } from 'src/shared/dto/version.dto';
import { Role } from 'src/shared/enums/role.enum';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { CommentOwnerDto } from './comment-owner.dto';

@Exclude()
export class AnswerBaseDto {
  @Expose()
  @IsNotEmptyString()
  content: string;
}

@Exclude()
export class AnswerCreateDto extends AnswerBaseDto {
  @Expose()
  @IsEnum(MiiLocation, { each: true })
  @ArrayUnique()
  locations?: MiiLocation[];
}

@Exclude()
export class AnswerUpdateDto extends AnswerBaseDto {
  @Expose()
  @IsEnum(MiiLocation, { each: true })
  @ArrayUnique()
  locations?: MiiLocation[];
}

@Exclude()
export class AnswerGetDto extends AnswerBaseDto {
  @Expose()
  @Type(() => VersionDto)
  versionOfItem: VersionDto;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @ExposeId()
  _id: string;

  @Type(() => CommentOwnerDto)
  @Expose()
  owner: CommentOwnerDto;

  @Expose({ groups: [Role.FdpgMember] })
  locations?: MiiLocation[];

  @Expose()
  isDone: boolean;
}
