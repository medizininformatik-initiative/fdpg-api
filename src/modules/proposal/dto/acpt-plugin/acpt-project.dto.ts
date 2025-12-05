export interface AcptMetaField {
  box: string;
  field: string;
  value: string | string[];
}

export interface AcptEntityDto {
  title: string;
  status: 'draft' | 'pending' | 'publish';
  content: string;
  acpt: {
    meta: AcptMetaField[];
  };
}

export type AcptProjectDto = AcptEntityDto;
export type AcptResearcherDto = AcptEntityDto;
export type AcptLocationDto = AcptEntityDto;

export interface AcptMetaFieldResponse {
  name: string;
  type: string;
  value: string | string[];
  default?: string;
  required?: boolean;
  showInAdmin?: boolean;
  options?: any[];
  advancedOptions?: any[];
}

export interface AcptMetaBoxResponse {
  meta_box: string;
  meta_fields: AcptMetaFieldResponse[];
}

export interface AcptResponseDto {
  id: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  status: string;
  acpt?: {
    meta: AcptMetaBoxResponse[];
  };
}

export type AcptProjectResponseDto = AcptResponseDto;
export type AcptResearcherResponseDto = AcptResponseDto;
export type AcptLocationResponseDto = AcptResponseDto;

export interface AcptListItemDto {
  id: string;
  title: {
    rendered: string;
  };
  acpt?: {
    meta: AcptMetaBoxResponse[];
  };
}

export type AcptResearcherListItemDto = AcptListItemDto;
export type AcptLocationListItemDto = AcptListItemDto;
