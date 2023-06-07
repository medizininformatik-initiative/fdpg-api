import { Expose, Type } from 'class-transformer';
import { IsObject, ValidateNested } from 'class-validator';
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
  ethicVote: EthicVoteDto;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => ResourceAndRecontact)
  resourceAndRecontact: ResourceAndRecontact;

  @Expose()
  @ValidateNested()
  @IsObject()
  @Type(() => PropertyRightsDto)
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
  informationOnRequestedBioSamples: InformationOnRequestedBioSamples;
}
