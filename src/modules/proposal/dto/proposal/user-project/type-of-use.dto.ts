import { Expose } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, MaxLength, ValidateIf } from 'class-validator';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import {
  DIFEProposalTypeOfUse,
  ProposalTypeOfUse,
  PseudonymizationInfoOptions,
} from 'src/modules/proposal/enums/proposal-type-of-use.enum';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';
import { Transform } from 'class-transformer';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { ExposeForDataSources } from 'src/shared/decorators/data-source.decorator';

export class TypeOfUseDto extends WithIdForObjectDto {
  @Expose()
  @IsArray()
  @IsEnum(ProposalTypeOfUse, { each: true })
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o, context) => {
    const proposal = context?.object;
    return proposal?.selectedDataSources?.includes(PlatformIdentifier.Mii);
  })
  usage: ProposalTypeOfUse[];

  @Expose()
  @IsOptional()
  @IsNotEmptyString()
  @MaxLength(10_000)
  @ValidateIf((o, context) => {
    const proposal = context?.object;
    return proposal?.selectedDataSources?.includes(PlatformIdentifier.Mii);
  })
  dataPrivacyExtra?: string;

  @Expose()
  @IsOptional()
  @IsNotEmptyString()
  @ValidateIf((o, context) => {
    const proposal = context?.object;
    return proposal?.selectedDataSources?.includes(PlatformIdentifier.Mii);
  })
  targetFormat?: string;

  @Expose()
  @IsOptional()
  @IsNotEmptyString()
  @ValidateIf((o, context) => {
    const proposal = context?.object;
    return proposal?.selectedDataSources?.includes(PlatformIdentifier.Mii);
  })
  targetFormatOther?: string;

  @Expose()
  @IsArray()
  @IsEnum(DIFEProposalTypeOfUse, { each: true })
  @IsOptional({ groups: [ProposalValidation.IsDraft] })
  @ExposeForDataSources([PlatformIdentifier.DIFE])
  @ValidateIf((o, context) => {
    const proposal = context?.object;
    return proposal?.selectedDataSources?.includes(PlatformIdentifier.DIFE);
  })
  difeUsage: DIFEProposalTypeOfUse[];

  @Expose()
  @IsArray()
  @IsEnum(PseudonymizationInfoOptions, { each: true })
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  @ValidateIf((o, context) => {
    const proposal = context?.object;
    return proposal?.selectedDataSources?.includes(PlatformIdentifier.Mii);
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
  @ValidateIf((o, context) => {
    const proposal = context?.object;
    return proposal?.selectedDataSources?.includes(PlatformIdentifier.Mii);
  })
  pseudonymizationInfoTexts: Record<PseudonymizationInfoOptions, string>;
}
