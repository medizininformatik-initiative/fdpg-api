import { findConsolidateDataSetsEntryByBusinessKey } from '../dsf-questionnaire-response.util';
import { FHIR_SYSTEM_CONSTANTS } from '../../constants/fhir-constants';

jest.mock('../../constants/fhir-constants', () => ({
  FHIR_SYSTEM_CONSTANTS: {
    'business-key': { targetKey: 'business-key-link-id' },
  },
}));

describe('findConsolidateDataSetsEntryByBusinessKey', () => {
  const targetLinkId = 'business-key-link-id';
  const validBusinessKey = 'BK-123';

  it('should return the resource when a matching business key is found', () => {
    const mockEntries: any[] = [
      {
        resource: {
          id: '1',
          item: [
            {
              linkId: 'some-other-id',
              answer: [{ valueString: 'other-val' }],
            },
          ],
        },
      },
      {
        resource: {
          id: '2',
          item: [
            {
              linkId: targetLinkId,
              answer: [{ valueString: validBusinessKey }],
            },
          ],
        },
      },
    ];

    const result = findConsolidateDataSetsEntryByBusinessKey(mockEntries, validBusinessKey);

    expect(result).toBeDefined();
    expect(result.id).toBe('2');
  });

  it('should return undefined if no entry matches the business key', () => {
    const mockEntries: any[] = [
      {
        resource: {
          item: [
            {
              linkId: targetLinkId,
              answer: [{ valueString: 'WRONG-KEY' }],
            },
          ],
        },
      },
    ];

    const result = findConsolidateDataSetsEntryByBusinessKey(mockEntries, validBusinessKey);

    expect(result).toBeUndefined();
  });

  it('should return undefined if the entry has no items', () => {
    const mockEntries: any[] = [
      {
        resource: {
          item: [],
        },
      },
    ];

    const result = findConsolidateDataSetsEntryByBusinessKey(mockEntries, validBusinessKey);

    expect(result).toBeUndefined();
  });

  it('should return undefined if the item exists but has no answer', () => {
    const mockEntries: any[] = [
      {
        resource: {
          item: [
            {
              linkId: targetLinkId,
              answer: [], // Empty answer
            },
          ],
        },
      },
    ];

    const result = findConsolidateDataSetsEntryByBusinessKey(mockEntries, validBusinessKey);

    expect(result).toBeUndefined();
  });

  it('should return undefined if the entries array is empty', () => {
    const result = findConsolidateDataSetsEntryByBusinessKey([], validBusinessKey);

    expect(result).toBeUndefined();
  });
});
