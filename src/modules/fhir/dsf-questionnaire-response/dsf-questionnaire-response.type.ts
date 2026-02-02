export interface QuestionnaireResponseItem {
  linkId: string;
  text?: string;
  answer?: Array<{ valueString?: string; valueBoolean?: boolean }>;
}

export interface QuestionnaireResponseResource {
  resourceType: string;
  id: string;
  status: string;
  item: QuestionnaireResponseItem[];
  author?: {
    type: string;
    identifier: {
      system: string;
      value: string;
    };
  };
  authored?: string;
}

export interface QuestionnaireResponseBundleEntry {
  fullUrl: string;
  resource: QuestionnaireResponseResource;
}
