import { mapTaskTableResponse } from '../fhir-received-dataset.util';

describe('mapTaskTableResponse', () => {
  const MOCK_MAPPINGS = {
    'simple-code': { targetKey: 'simpleField', valuePath: 'valueString' },
    'nested-code': { targetKey: 'nestedField', valuePath: 'valueReference.reference' },
    'complex-code': [
      { targetKey: 'complexField1', valuePath: 'valuePeriod.start' },
      { targetKey: 'complexField2', valuePath: 'valuePeriod.end' },
    ],
  };

  const baseResource = {
    status: 'requested',
    intent: 'order',
    authoredOn: '2023-01-01',
  };

  it('should map direct properties from resource correctly', () => {
    const entry = { resource: { ...baseResource } };
    const result = mapTaskTableResponse(entry, {});

    expect(result).toEqual({
      status: 'requested',
      intent: 'order',
      authoredOn: '2023-01-01',
    });
  });

  it('should map simple input fields based on code mappings', () => {
    const entry = {
      resource: {
        ...baseResource,
        input: [
          {
            type: { coding: [{ code: 'simple-code' }] },
            valueString: 'Hello World',
          },
        ],
      },
    };

    const result = mapTaskTableResponse(entry, MOCK_MAPPINGS) as any;

    expect(result.simpleField).toBe('Hello World');
  });

  it('should map nested values correctly using dot notation', () => {
    const entry = {
      resource: {
        ...baseResource,
        input: [
          {
            type: { coding: [{ code: 'nested-code' }] },
            valueReference: { reference: 'Patient/123' },
          },
        ],
      },
    };

    const result = mapTaskTableResponse(entry, MOCK_MAPPINGS) as any;

    expect(result.nestedField).toBe('Patient/123');
  });

  it('should handle array mappings (one input code mapping to multiple fields)', () => {
    const entry = {
      resource: {
        ...baseResource,
        input: [
          {
            type: { coding: [{ code: 'complex-code' }] },
            valuePeriod: { start: '2023-01-01', end: '2023-01-31' },
          },
        ],
      },
    };

    const result = mapTaskTableResponse(entry, MOCK_MAPPINGS) as any;

    expect(result.complexField1).toBe('2023-01-01');
    expect(result.complexField2).toBe('2023-01-31');
  });

  it('should ignore input items with codes not in the mapping', () => {
    const entry = {
      resource: {
        ...baseResource,
        input: [
          {
            type: { coding: [{ code: 'unknown-code' }] },
            valueString: 'Should be ignored',
          },
        ],
      },
    };

    const result = mapTaskTableResponse(entry, MOCK_MAPPINGS) as any;

    expect(result.simpleField).toBeUndefined();
    expect(Object.keys(result)).toEqual(['status', 'intent', 'authoredOn']);
  });

  it('should safely handle missing value properties in input', () => {
    const entry = {
      resource: {
        ...baseResource,
        input: [
          {
            type: { coding: [{ code: 'simple-code' }] },
          },
        ],
      },
    };

    const result = mapTaskTableResponse(entry, MOCK_MAPPINGS) as any;

    expect(result.simpleField).toBeUndefined();
  });

  it('should safely handle missing input array', () => {
    const entry = {
      resource: { ...baseResource, input: undefined },
    };

    const result = mapTaskTableResponse(entry, MOCK_MAPPINGS);
    expect(result).toEqual(baseResource);
  });

  it('should throw an error if resource is missing', () => {
    const entry = {};

    expect(() => mapTaskTableResponse(entry, MOCK_MAPPINGS)).toThrow(
      "Input data does not contain a 'resource' object.",
    );
  });
});
