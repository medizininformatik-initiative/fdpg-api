import { DateTime, Interval } from 'luxon';
import { AxiosInstance } from 'node_modules/axios/index.cjs';

export const FhirHelpersUtil = {
  subtractOneHour: (date: Date) => {
    const newDate = new Date(date.getTime());
    const currentHour = newDate.getHours();
    newDate.setHours(currentHour - 1);

    return newDate;
  },

  /**
   * Calculates the ISO 8601 period duration string
   */
  getExtractionPeriod: (startDate: Date, endDate: Date): string => {
    const startOriginal = DateTime.fromJSDate(startDate);
    const endOriginal = DateTime.fromJSDate(endDate);

    const startAdjusted = startOriginal.endOf('day');
    const endAdjusted = endOriginal.endOf('day');

    const interval = Interval.fromDateTimes(startAdjusted, endAdjusted);

    const duration = interval.toDuration(['years', 'months', 'days']);

    return duration.toISO();
  },

  findNextLinkForPagination: (links: Array<{ relation: string; url: string }>, baseUrl: string): string | undefined => {
    if (!baseUrl) {
      throw new Error('baseUrl not given');
    }

    const nextLink = links.find((link) => link.relation === 'next');

    if (nextLink) {
      const fullUrl = nextLink.url;
      if (fullUrl.startsWith(baseUrl)) {
        return fullUrl.substring(baseUrl.length);
      }
      return fullUrl;
    }

    return undefined;
  },

  /**
   * Async generator to paginate through a FHIR resource.
   * It yields the raw entries for each page.
   * @param apiClient The HTTP client (e.g., axios instance) with a base URL configured.
   * @param baseUrl The base URL string used to strip from the 'next' link (e.g., 'https://api.example.com/fhir').
   * @param initialParams The query parameters for the first request (e.g., {_sort: '-_lastUpdated'}).
   * @param initialPath The relative path for the first request (defaults to '/Task').
   * @yields {Array<any>} An array of raw FHIR resource entries for a single page.
   */
  paginateFhirTaskGenerator: async function* (
    apiClient: AxiosInstance,
    initialParams: Record<string, any>,
    initialPath: string = '/Task',
  ) {
    let currentPath = initialPath;
    let requestParams: Record<string, any> | undefined = initialParams;

    while (currentPath) {
      try {
        const response = await apiClient.get(currentPath, { params: requestParams });

        // Yield the entries of the current page
        if (response.data.entry) {
          yield response.data.entry;
        }

        // Determine the next page path using the helper logic
        // We pass the links and the baseUrl to get the clean relative path.
        currentPath = this.findNextLinkForPagination(response.data.link || [], apiClient.defaults.baseURL) || '';

        // Clear parameters after the first request, as they are in the 'currentPath' now
        requestParams = undefined;
      } catch (error) {
        // Log/handle error details before re-throwing if necessary
        throw error;
      }
    }
  },
};
