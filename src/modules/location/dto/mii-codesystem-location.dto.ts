export interface MiiCodesystemLocationDto {
  code?: string;
  display?: string;
  definition?: string;
  consortium?: string;
  uri?: string;
  status?: 'active' | 'deprecated';
  contract?: string;
  abbreviation?: string;
  dic?: boolean; // boolean flag if this location is a DIZ / data integration center
  dataManagement?: boolean; // boolean flag if this location is a data management location
  deprecationDate?: string;
  replaces?: string; // code of the location that is replaced by this location
  replacedBy?: string; // code of the location that was replaced by this location
}
