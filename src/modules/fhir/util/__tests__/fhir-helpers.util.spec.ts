import { FhirHelpersUtil } from '../../util/fhir-helpers.util';
import { DateTime } from 'luxon';

describe('FhirHelpersUtil', () => {
  describe('subtractOneHour', () => {
    it('should subtract exactly one hour from the given date', () => {
      const input = new Date('2023-10-10T12:00:00.000Z');
      const result = FhirHelpersUtil.subtractOneHour(input);

      const expected = new Date('2023-10-10T11:00:00.000Z');
      expect(result.toISOString()).toBe(expected.toISOString());
    });

    it('should handle date rollover correctly', () => {
      const input = new Date('2023-10-10T00:30:00.000Z');
      // 00:30 UTC minus 1 hour might depend on local time execution if not careful,
      // but getHours/setHours operates on local time.
      // Ideally, the input should be treated consistently.
      // Let's assume the test runs in a consistent environment or check relative diff.
      const result = FhirHelpersUtil.subtractOneHour(input);

      const diff = input.getTime() - result.getTime();
      expect(diff).toBe(60 * 60 * 1000); // 3600000 ms
    });
  });

  describe('getExtractionPeriod', () => {
    it('should return correct ISO duration for given dates', () => {
      const start = new Date('2023-01-01T00:00:00.000Z');
      const end = new Date('2023-02-01T00:00:00.000Z');

      // Logic sets both to endOf('day').
      // Jan 1 end -> Feb 1 end is exactly 1 month or 31 days depending on Luxon config,
      // but usually 'P1M' for one calendar month difference.
      const result = FhirHelpersUtil.getExtractionPeriod(start, end);

      // Luxon defaults to specific units passed: ['years', 'months', 'days']
      // Jan 1 to Feb 1 is exactly 1 month.
      expect(result).toMatch(/P1M|P31D/);
    });

    it('should calculate duration for partial days as full days due to endOf day logic', () => {
      const start = new Date('2023-01-01T10:00:00.000Z'); // Jan 1
      const end = new Date('2023-01-02T08:00:00.000Z'); // Jan 2

      // Jan 1 23:59 -> Jan 2 23:59 = 1 Day
      const result = FhirHelpersUtil.getExtractionPeriod(start, end);
      expect(result).toBe('P1D');
    });
  });

  describe('findNextLinkForPagination', () => {
    const baseUrl = 'https://fhir-server.com/api';

    it('should throw error if baseUrl is missing', () => {
      expect(() => {
        FhirHelpersUtil.findNextLinkForPagination([], '');
      }).toThrow('baseUrl not given');
    });

    it('should return relative path if next link starts with base URL', () => {
      const links = [
        { relation: 'self', url: `${baseUrl}/Task?page=1` },
        { relation: 'next', url: `${baseUrl}/Task?page=2` },
      ];

      const result = FhirHelpersUtil.findNextLinkForPagination(links, baseUrl);
      expect(result).toBe('/Task?page=2');
    });

    it('should return full URL if next link does not start with base URL', () => {
      const otherUrl = 'https://other-server.com/Task?page=2';
      const links = [{ relation: 'next', url: otherUrl }];

      const result = FhirHelpersUtil.findNextLinkForPagination(links, baseUrl);
      expect(result).toBe(otherUrl);
    });

    it('should return undefined if no next link is present', () => {
      const links = [{ relation: 'self', url: '...' }];
      const result = FhirHelpersUtil.findNextLinkForPagination(links, baseUrl);
      expect(result).toBeUndefined();
    });
  });

  describe('paginateFhirTaskGenerator', () => {
    let apiClientMock: any;
    const baseUrl = 'https://fhir.com';

    beforeEach(() => {
      apiClientMock = {
        get: jest.fn(),
        defaults: { baseURL: baseUrl },
      };
    });

    it('should yield entries from multiple pages and stop when no next link exists', async () => {
      const initialPath = '/Task';
      const initialParams = { _sort: 'date' };

      const page1Response = {
        data: {
          entry: [{ id: '1' }, { id: '2' }],
          link: [{ relation: 'next', url: `${baseUrl}/Task?page=2` }],
        },
      };

      const page2Response = {
        data: {
          entry: [{ id: '3' }],
          link: [], // No next link
        },
      };

      apiClientMock.get.mockResolvedValueOnce(page1Response).mockResolvedValueOnce(page2Response);

      const generator = FhirHelpersUtil.paginateFhirTaskGenerator(apiClientMock, initialParams, initialPath);

      const results = [];
      for await (const page of generator) {
        results.push(page);
      }

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(page1Response.data.entry);
      expect(results[1]).toEqual(page2Response.data.entry);

      expect(apiClientMock.get).toHaveBeenCalledTimes(2);
      expect(apiClientMock.get).toHaveBeenNthCalledWith(1, initialPath, { params: initialParams });
      // Second call should have undefined params because they are embedded in the next link
      expect(apiClientMock.get).toHaveBeenNthCalledWith(2, '/Task?page=2', { params: undefined });
    });

    it('should yield nothing if first page has no entries', async () => {
      apiClientMock.get.mockResolvedValue({
        data: { entry: undefined, link: [] },
      });

      const generator = FhirHelpersUtil.paginateFhirTaskGenerator(apiClientMock, {});

      const results = [];
      for await (const page of generator) {
        results.push(page);
      }

      expect(results).toHaveLength(0);
      expect(apiClientMock.get).toHaveBeenCalledTimes(1);
    });

    it('should throw error if api client throws', async () => {
      apiClientMock.get.mockRejectedValue(new Error('Network Error'));

      const generator = FhirHelpersUtil.paginateFhirTaskGenerator(apiClientMock, {});

      await expect(async () => {
        for await (const _ of generator) {
        }
      }).rejects.toThrow('Network Error');
    });
  });
});
