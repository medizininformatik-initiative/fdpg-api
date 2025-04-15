import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  GeneralProjectInformation,
  GeneralProjectInformationSchema,
} from './user-project/general-project-information.schema';
import { Feasibility, FeasibilitySchema } from './user-project/feasibility.schema';
import { ProjectDetails, ProjectDetailsSchema } from './user-project/project-details.schema';
import { EthicVote, EthicVoteSchema } from './user-project/ethic-vote.schema';
import { ResourceAndRecontact, ResourceAndRecontactSchema } from './user-project/resource-and-recontact.schema';
import { PropertyRights, PropertyRightsSchema } from './user-project/property-rights.schema';
import { PlannedPublication, PlannedPublicationSchema } from './user-project/planned-publication.schema';
import { Addressees, AddresseesSchema } from './user-project/addressees.schema';
import { TypeOfUse, TypeOfUseSchema } from './user-project/type-of-use.schema';
import {
  InformationOnRequestedBioSamples,
  InformationOnRequestedBioSamplesSchema,
} from './user-project/information-on-biosample.schema';
import { DifeVariableSelectionData, VariableSelectionData } from './variable-selection-data.schema';
import { PlatformIdentifier } from 'src/modules/admin/enums/platform-identifier.enum';

export type UserProjectDocument = UserProject & Document;

@Schema({ _id: false })
export class UserProject {
  @Prop({ type: GeneralProjectInformationSchema })
  generalProjectInformation: GeneralProjectInformation;

  @Prop({ type: FeasibilitySchema })
  feasibility: Feasibility;

  @Prop({ type: ProjectDetailsSchema })
  projectDetails: ProjectDetails;

  @Prop({ type: EthicVoteSchema })
  ethicVote: EthicVote;

  @Prop({ type: ResourceAndRecontactSchema })
  resourceAndRecontact: ResourceAndRecontact;

  @Prop({ type: PropertyRightsSchema })
  propertyRights: PropertyRights;

  @Prop({ type: PlannedPublicationSchema })
  plannedPublication: PlannedPublication;

  @Prop({ type: AddresseesSchema })
  addressees: Addressees;

  @Prop({ type: TypeOfUseSchema })
  typeOfUse: TypeOfUse;

  @Prop({ type: InformationOnRequestedBioSamplesSchema })
  informationOnRequestedBioSamples: InformationOnRequestedBioSamples;

  @Prop({
    type: Object,
    default: () => {},
  })
  variableSelection: Partial<Record<PlatformIdentifier, VariableSelectionData | DifeVariableSelectionData>>;
}

export const UserProjectSchema = SchemaFactory.createForClass(UserProject);
