import { FHIR_SYSTEM_CONSTANTS } from '../constants/fhir-constants';
import { QuestionnaireResponseBundleEntry } from './dsf-questionnaire-response.type';

export const findConsolidateDataSetsEntryByBusinessKey = (
  entries: QuestionnaireResponseBundleEntry[],
  businessKey: string,
) => {
  const match = entries.find((entry) => {
    const items = entry.resource.item || [];
    const businessKeyItem = items.find((item) => item.linkId === FHIR_SYSTEM_CONSTANTS['business-key'].targetKey);
    const actualValue = businessKeyItem?.answer?.[0]?.valueString;

    return actualValue === businessKey;
  });

  return match?.resource;
};
