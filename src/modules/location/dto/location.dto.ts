export class LocationDto {
  _id: string;
  externalCode: string;
  display: string;
  definition?: string;
  consortium: string;
  contract?: string;
  abbreviation?: string;
  uri?: string;
  rubrum?: string;
  dataIntegrationCenter: boolean;
  dataManagementCenter: boolean;
  deprecationDate?: Date;
  deprecated: boolean;
}

export class LocationKeyLabelDto {
  locationKey: string;
  locationLabel: string;
}
