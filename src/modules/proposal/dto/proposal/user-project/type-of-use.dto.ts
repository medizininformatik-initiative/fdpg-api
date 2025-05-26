import { Expose } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import {
  DIFEProposalTypeOfUse,
  ProposalTypeOfUse,
  PseudonymizationInfoOptions,
} from 'src/modules/proposal/enums/proposal-type-of-use.enum';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { Transform } from 'class-transformer';
import { ExposeForDataSources } from 'src/shared/decorators/data-source.decorator';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';

export class TypeOfUseDto extends WithIdForObjectDto {
  @Expose()
  @IsArray()
  @IsEnum(ProposalTypeOfUse, { each: true })
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  @ExposeForDataSources([PlatformIdentifier.Mii])
  usage: ProposalTypeOfUse[];

  @Expose()
  @IsOptional()
  @IsNotEmptyString()
  @MaxLength(10_000)
  dataPrivacyExtra?: string;

  @Expose()
  @IsOptional()
  @IsNotEmptyString()
  targetFormat?: string;

  @Expose()
  @IsOptional()
  @IsNotEmptyString()
  targetFormatOther?: string;

  @Expose()
  @IsArray()
  @IsEnum(DIFEProposalTypeOfUse, { each: true })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @ExposeForDataSources([PlatformIdentifier.DIFE])
  difeUsage: DIFEProposalTypeOfUse[];

  @Expose()
  @IsArray()
  @IsEnum(PseudonymizationInfoOptions, { each: true })
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  pseudonymizationInfo: PseudonymizationInfoOptions[];

  @Expose()
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @Transform(({ obj: { pseudonymizationInfoTexts } }) => ({
    [PseudonymizationInfoOptions.enableRecordLinkage]:
      pseudonymizationInfoTexts?.[PseudonymizationInfoOptions.enableRecordLinkage] ?? '',
    [PseudonymizationInfoOptions.siteGroupingEnabled]:
      pseudonymizationInfoTexts?.[PseudonymizationInfoOptions.siteGroupingEnabled] ?? '',
    [PseudonymizationInfoOptions.namedSiteVariable]:
      pseudonymizationInfoTexts?.[PseudonymizationInfoOptions.namedSiteVariable] ?? '',
  }))
  pseudonymizationInfoTexts: Record<PseudonymizationInfoOptions, string>;
}
