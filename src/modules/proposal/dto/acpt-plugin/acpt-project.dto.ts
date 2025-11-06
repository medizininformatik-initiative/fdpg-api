export interface AcptMetaField {
  box: string;
  field: string;
  value: string | string[];
}

export interface AcptProjectDto {
  title: string;
  status: 'draft' | 'pending' | 'publish';
  content: string;
  acpt: {
    meta: AcptMetaField[];
  };
}

export interface AcptProjectResponseDto {
  id: string;
  status: string;
  message?: string;
}
