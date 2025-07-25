import { Expose, Type, Transform } from 'class-transformer';
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

export class UserProjectDto {
  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => GeneralProjectInformationDto)
  generalProjectInformation: GeneralProjectInformationDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => FeasibilityDto)
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  feasibility: FeasibilityDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => ProjectDetailsDto)
  projectDetails: ProjectDetailsDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => EthicVoteDto)
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  ethicVote: EthicVoteDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => ResourceAndRecontact)
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  resourceAndRecontact: ResourceAndRecontact;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => PropertyRightsDto)
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  propertyRights: PropertyRightsDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => PlannedPublicationDto)
  plannedPublication: PlannedPublicationDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => AddresseesDto)
  @ExposeForDataSources([PlatformIdentifier.Mii])
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  addressees: AddresseesDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => TypeOfUseDto)
  typeOfUse: TypeOfUseDto;

  @Expose()
  @ValidateNested()
  @Type(() => InformationOnRequestedBioSamples)
  @IsObject({ groups: [ProposalValidation.IsBiosampleType] })
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  @ExposeForDataSources([PlatformIdentifier.Mii])
  informationOnRequestedBioSamples: InformationOnRequestedBioSamples;

  @Expose()
  @IsObject()
  @IsOptional()
  @Type(() => VariableSelectionDataDto)
  @Transform(({ obj }) => obj?.variableSelection)
  variableSelection: VariableSelectionDataDto;

  @Expose()
  @IsObject()
  @IsOptional()
  @Type(() => SelectionOfCasesDto)
  @ValidateNested()
  selectionOfCases: SelectionOfCasesDto;

  @Expose()
  @ValidateNested()
  @Type(() => CohortDto)
  @IsObject()
  @ValidateIf((o) => o.selectedDataSources?.includes(PlatformIdentifier.Mii))
  cohorts: CohortDto;
}
