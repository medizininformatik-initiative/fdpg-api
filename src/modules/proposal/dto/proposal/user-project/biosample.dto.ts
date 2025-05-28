import { Expose } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, MaxLength, IsArray } from 'class-validator';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { WithIdForArrayDto } from 'src/shared/dto/with-id-for-array.dto';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { BiosampleType } from 'src/modules/proposal/enums/biosample-type.enum';
import { BiosampleCode } from 'src/modules/proposal/enums/biosample-code.enum';

export class BiosampleDto extends WithIdForArrayDto {
  @Expose()
  @IsEnum(BiosampleType, { groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  type: BiosampleType;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  typeDetails: string;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @MaxLength(10000)
  count: string;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @MaxLength(10000)
  parameter: string;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @MaxLength(10000)
  requirements: string;

  @Expose()
  @IsBoolean()
  @IsOptional()
  optionalBiosample: boolean = false;

  @Expose()
  @IsArray()
  @IsEnum(BiosampleCode, { each: true, groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  sampleCode: BiosampleCode[];

  @Expose()
  @IsNotEmptyString()
  @IsOptional()
  @MaxLength(10000)
  [BiosampleCode.SNOMED]?: string;

  @Expose()
  @IsNotEmptyString()
  @IsOptional()
  @MaxLength(10000)
  [BiosampleCode.SPREC]?: string;

  @Expose()
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @MaxLength(3000)
  method: string;

  @Expose()
  @IsBoolean()
  @IsOptional()
  externalLabTransfer: boolean = false;

  @Expose()
  @IsNotEmptyString()
  @IsOptional()
  @MaxLength(1000)
  externalLabTransferDetails: string;
}
