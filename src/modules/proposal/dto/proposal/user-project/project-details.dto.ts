import { Expose } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, MaxLength, ValidateIf } from 'class-validator';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { Department } from 'src/modules/proposal/enums/department.enum';
import { ProposalValidation } from 'src/modules/proposal/enums/porposal-validation.enum';
import { ExposeForDataSources } from 'src/shared/decorators/data-source.decorator';
import { UiWidget } from 'src/shared/decorators/ui-widget.decorator';
import { WithIdForObjectDto } from 'src/shared/dto/with-id-for-object.dto';
import { IsNotEmptyString } from 'src/shared/validators/is-not-empty-string.validator';

export class ProjectDetailsDto extends WithIdForObjectDto {
  @Expose()
  @MaxLength(10000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  @UiWidget({ type: 'richtext' })
  simpleProjectDescription: string;

  @Expose()
  @IsArray()
  @IsEnum(Department, { each: true })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  @UiWidget({ type: 'select', format: 'multiple' })
  department: Department[];

  @Expose()
  @MaxLength(10000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  @UiWidget({ type: 'richtext' })
  scientificBackground: string;

  @Expose()
  @MaxLength(10000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  @UiWidget({ type: 'richtext' })
  hypothesisAndQuestionProjectGoals: string;

  @Expose()
  @MaxLength(10000)
  @IsNotEmptyString({ groups: [ProposalValidation.IsNotDraft] })
  @IsOptional({ groups: [ProposalValidation.IsDraft, ProposalValidation.IsDIFEDataSource] })
  @UiWidget({ type: 'richtext' })
  materialAndMethods: string;

  @Expose()
  @IsOptional()
  @MaxLength(10000)
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  @UiWidget({ type: 'richtext' })
  executiveSummaryUac: string;

  @Expose()
  @IsOptional()
  @MaxLength(10000)
  @UiWidget({ type: 'richtext' })
  literature: string;

  @Expose()
  @IsOptional()
  @MaxLength(10000)
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  @UiWidget({ type: 'richtext' })
  biometric: string;
}
