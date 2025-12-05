/**
 * Example:
 *
 * {"status":"completed",
 *  "intent":"order",
 *  "authoredOn":"2025-11-20T21:44:30+01:00",
 *  "message-name":"receivedDataSet",
 *  "business-key":"3ffac37b-aba4-46ca-a361-599aca4f9e32",
 *  "dic-identifier-value":"diz-test.gecko.hs-heilbronn.de"}
 *
 * {"status":"completed",
 *  "intent":"order",
 *  "authoredOn":"2025-10-15T23:33:36+02:00",
 *  "message-name":"receivedDataSet",
 *  "business-key":"f0626200-6732-4d58-a54d-d3e9ba91d991",
 *  "dic-identifier-value":"ukhd.de"}
 *
 */
export interface FhirReceivedDataSetType {
  status: string;
  intent: string;
  authoredOn: Date;
  'message-name': string;
  'business-key': string;
  'dic-identifier-value': string;
}
