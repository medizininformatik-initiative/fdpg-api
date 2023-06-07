import { Expose } from 'class-transformer';
import { IsEnum } from 'class-validator';
import { IsValidId } from 'src/shared/validators/is-valid-id.validator';
import { ReferenceType } from '../enums/reference-type.enum';

export class CommentReferenceDto {
  @IsValidId()
  @Expose()
  referenceDocumentId: string;
}

export class CommentCreateReferenceDto extends CommentReferenceDto {
  @IsValidId()
  @Expose()
  referenceObjectId: string;

  @IsEnum(ReferenceType)
  @Expose()
  referenceType: ReferenceType;
}
