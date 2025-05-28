import { Expose, Type } from 'class-transformer';
import { ArrayNotEmpty, ValidateNested, IsBoolean, IsString, IsOptional, MaxLength } from 'class-validator';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { BiosampleDto } from './biosample.dto';

export class InformationOnRequestedBioSamples extends WithIdForObjectDto {
  @IsBoolean()
  @IsOptional()
  @Expose()
  noSampleRequired: boolean;

  @IsString()
  @IsOptional()
  @Expose()
  @MaxLength(10000)
  laboratoryResources: string;

  @ValidateNested()
  @Type(() => BiosampleDto)
  @ArrayNotEmpty({ groups: [ProposalValidation.IsNotDraft] })
  @Expose()
  biosamples: BiosampleDto[];
}
