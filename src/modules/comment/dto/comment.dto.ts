import { Exclude, Expose, Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsEnum, ValidateNested } from 'class-validator';
import { ExposeId } from 'src/shared/decorators/transform/expose-id.decorator';
import { VersionDto } from 'src/shared/dto/version.dto';
import { Role } from 'src/shared/enums/role.enum';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { CommentType } from '../enums/comment-type.enum';
import { AnswerGetDto } from './answer.dto';
import { CommentOwnerDto } from './comment-owner.dto';

@Exclude()
export class CommentBaseDto {
  @Expose()
  @IsNotEmptyString()
  content: string;

  @IsEnum(CommentType)
  @Expose()
  type: CommentType;
}

@Exclude()
export class CommentCreateDto extends CommentBaseDto {
  @Expose()
  @ArrayUnique()
  locations?: string[];
}

@Exclude()
export class CommentUpdateDto extends CommentBaseDto {
  @Expose()
  @ArrayUnique()
  locations?: string[];
}

@Exclude()
export class CommentGetDto extends CommentBaseDto {
  @Expose()
  @Type(() => VersionDto)
  versionOfItem: VersionDto;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @ValidateNested()
  @IsArray()
  @Expose()
  @Type(() => AnswerGetDto)
  answers: AnswerGetDto[];

  @Expose()
  @IsBoolean()
  isAnonym: boolean;

  @ExposeId()
  _id: string;

  @Type(() => CommentOwnerDto)
  @Expose()
  owner: CommentOwnerDto;

  @Expose({ groups: [Role.FdpgMember, Role.DataSourceMember] })
  locations?: string[];

  @Expose()
  referenceObjectId: string;

  @Expose()
  isDone: boolean;
}
