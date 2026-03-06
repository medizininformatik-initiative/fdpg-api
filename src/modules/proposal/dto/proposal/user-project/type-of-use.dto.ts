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
import { UiWidget } from 'src/shared/decorators/ui-widget.decorator';

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
  @UiWidget({ type: 'select', format: 'multiple' })
  usage: ProposalTypeOfUse[];

  @Expose()
  @IsOptional()
  @IsNotEmptyString()
  @MaxLength(10_000)
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o, context) => {
    const proposal = context?.object;
    return proposal?.selectedDataSources?.includes(PlatformIdentifier.Mii);
  })
  @UiWidget({ type: 'textfield' })
  dataPrivacyExtra?: string;

  @Expose()
  @IsOptional()
  @IsNotEmptyString()
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o, context) => {
    const proposal = context?.object;
    return proposal?.selectedDataSources?.includes(PlatformIdentifier.Mii);
  })
  @UiWidget({ type: 'textfield' })
  targetFormat?: string;

  @Expose()
  @IsOptional()
  @IsNotEmptyString()
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o, context) => {
    const proposal = context?.object;
    return proposal?.selectedDataSources?.includes(PlatformIdentifier.Mii);
  })
  @UiWidget({ type: 'textfield' })
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
  @UiWidget({ type: 'select', format: 'multiple' })
  difeUsage: DIFEProposalTypeOfUse[];

  @Expose()
  @IsArray()
  @IsEnum(PseudonymizationInfoOptions, { each: true })
  @IsOptional({
    groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource],
  })
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o, context) => {
    const proposal = context?.object;
    return proposal?.selectedDataSources?.includes(PlatformIdentifier.Mii);
  })
  @UiWidget({ type: 'select', format: 'multiple' })
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
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @UiWidget({ type: 'richtext', format: 'multiple' })
  pseudonymizationInfoTexts: Record<PseudonymizationInfoOptions, string>;
}
