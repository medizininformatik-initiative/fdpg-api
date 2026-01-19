export enum DataSourceStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
}

export enum DataSourceOrigin {
  NFDI4HEALTH = 'NFDI4HEALTH',
}

export enum DataSourceSortField {
  TITLE = 'TITLE',
  EXTERNAL_IDENTIFIER = 'EXTERNAL_IDENTIFIER',
  STATUS = 'STATUS',
  CREATED_AT = 'CREATED_AT',
  UPDATED_AT = 'UPDATED_AT',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}
