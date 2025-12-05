export const FHIR_SYSTEM_CONSTANTS = {
  // For "message-name" and "business-key", we map to a single target key
  // and specify the path to the string value (valueString).
  'message-name': {
    targetKey: 'message-name',
    valuePath: 'valueString',
  },
  'business-key': {
    targetKey: 'business-key',
    valuePath: 'valueString',
  },
  'dic-identifier': [
    {
      targetKey: 'dic-identifier-value',
      valuePath: 'valueReference.identifier.value',
    },
  ],
};
