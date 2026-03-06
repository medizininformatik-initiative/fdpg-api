import { Expose, Transform, Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested, ValidateIf } from 'class-validator';
import { ProposalValidation } from '../../enums/porposal-validation.enum';
import { AddresseesDto } from './user-project/addressees.dto';
import { EthicVoteDto } from './user-project/ethic-vote.dto';
import { FeasibilityDto } from './user-project/feasibility.dto';
import { GeneralProjectInformationDto } from './user-project/general-project-information.dto';
import { InformationOnRequestedBioSamples } from './user-project/information-on-biosample.dto';
import { PlannedPublicationDto } from './user-project/planned-publication.dto';
import { ProjectDetailsDto } from './user-project/project-details.dto';
import { PropertyRightsDto } from './user-project/property-rights.dto';
import { ResourceAndRecontact } from './user-project/resource-and-recontact.dto';
import { TypeOfUseDto } from './user-project/type-of-use.dto';
import { VariableSelectionDataDto } from './variables/variable-selection-data.dto';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';
import { SelectionOfCasesDto } from './user-project/selection-of-cases.dto';
import { CohortDto } from './user-project/cohort.dto';
import { ExposeForDataSources } from 'src/shared/decorators/data-source.decorator';
import { UiNested } from 'src/shared/decorators/ui-widget.decorator';
import { OutputGroup } from 'src/shared/enums/output-group.enum';

export class UserProjectDto {
  @Expose()
  @ValidateNested()
  @IsObject()
  @UiNested(() => GeneralProjectInformationDto)
  generalProjectInformation: GeneralProjectInformationDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => FeasibilityDto)
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  @Transform(({ value, options }) => {
    if (
      options?.groups?.includes(OutputGroup.FormSchemaOnly) ||
      options?.groups?.includes(OutputGroup.WithFormSchema)
    ) {
      return undefined;
    }
    return value;
  })
  feasibility: FeasibilityDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @UiNested(() => ProjectDetailsDto)
  projectDetails: ProjectDetailsDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @UiNested(() => EthicVoteDto)
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  ethicVote: EthicVoteDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @UiNested(() => ResourceAndRecontact)
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  resourceAndRecontact: ResourceAndRecontact;

  @Expose()
  @ValidateNested()
  @IsObject()
  @UiNested(() => PropertyRightsDto)
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  propertyRights: PropertyRightsDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @UiNested(() => PlannedPublicationDto)
  plannedPublication: PlannedPublicationDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @UiNested(() => AddresseesDto)
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  addressees: AddresseesDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @UiNested(() => TypeOfUseDto)
  typeOfUse: TypeOfUseDto;

  @Expose()
  @ValidateNested()
  @UiNested(() => InformationOnRequestedBioSamples)
  @IsObject({ groups: [ProposalValidation.IsBiosampleType] })
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @Transform((params) => params.obj.informationOnRequestedBioSamples)
  informationOnRequestedBioSamples: InformationOnRequestedBioSamples;

  @Expose()
  @IsObject()
  @IsOptional()
  @UiNested(() => VariableSelectionDataDto)
  @ValidateIf((o) => (o.selectedDataSources?.length ?? 0) > 0)
  @Transform(({ obj }) => obj?.variableSelection)
  variableSelection: VariableSelectionDataDto;

  @Expose()
  @IsObject()
  @IsOptional()
  @UiNested(() => SelectionOfCasesDto)
  @ValidateNested()
  selectionOfCases: SelectionOfCasesDto;

  @Expose()
  @ValidateNested()
  @Type(() => CohortDto)
  @IsObject()
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  @Transform(({ value, options }) => {
    if (
      options?.groups?.includes(OutputGroup.FormSchemaOnly) ||
      options?.groups?.includes(OutputGroup.WithFormSchema)
    ) {
      return undefined;
    }
    return value;
  })
  cohorts: CohortDto;
}
