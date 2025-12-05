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
  authored?: string;
}

export interface QuestionnaireResponseBundleEntry {
  fullUrl: string;
  resource: QuestionnaireResponseResource;
}
