/**
 * Generic ACPT Plugin DTO structure
 * Used for projects, researchers, and locations
 */

export interface AcptMetaField {
  box: string; // e.g., 'project-fields', 'fdpgx-researcher-fields', 'location-fields'
  field: string; // e.g., 'fdpgx-projecttitle', 'fdpgx-firstname', 'fdpgx-name'
  value: string | string[]; // The field value - STRING or ARRAY only
}

export interface AcptEntityDto {
  title: string;
  status: 'draft' | 'pending' | 'publish';
  content: string;
  acpt: {
    meta: AcptMetaField[];
  };
}

// Type aliases for better code readability
export type AcptProjectDto = AcptEntityDto;
export type AcptResearcherDto = AcptEntityDto;
export type AcptLocationDto = AcptEntityDto;

/**
 * Meta field structure in the API response
 */
export interface AcptMetaFieldResponse {
  name: string; // e.g., 'fdpgx-firstname', 'fdpgx-lastname'
  type: string; // e.g., 'Text'
  value: string | string[];
  default?: string;
  required?: boolean;
  showInAdmin?: boolean;
  options?: any[];
  advancedOptions?: any[];
}

/**
 * Meta box structure in the API response
 */
export interface AcptMetaBoxResponse {
  meta_box: string; // e.g., 'fdpgx-researcher-fields', 'project-fields', 'location-fields'
  meta_fields: AcptMetaFieldResponse[];
}

export interface AcptResponseDto {
  id: string; // WordPress post ID
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

// Type aliases for responses
export type AcptProjectResponseDto = AcptResponseDto;
export type AcptResearcherResponseDto = AcptResponseDto;
export type AcptLocationResponseDto = AcptResponseDto;

// List item (used for GET all operations)
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
