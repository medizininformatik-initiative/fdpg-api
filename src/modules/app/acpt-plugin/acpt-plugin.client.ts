import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  AcptProjectDto,
  AcptProjectResponseDto,
  AcptResearcherDto,
  AcptResearcherListItemDto,
  AcptResearcherResponseDto,
  AcptLocationDto,
  AcptLocationListItemDto,
  AcptLocationResponseDto,
} from '../../proposal/dto/acpt-plugin/acpt-project.dto';

/**
 * Client for interacting with the ACPT WordPress Plugin API
 * This API is used to sync registering form projects to the external WordPress website
 *
 * API Documentation:
 * - Base URL: https://prelive.forschen-fuer-gesundheit.de/wp-json/wp/v2/fdpgx-project/
 * - Authentication: Basic Auth (HTTP Basic Authentication)
 * - Endpoint: POST /fdpgx-project (create) or POST /fdpgx-project/{id} (update)
 */
@Injectable()
export class AcptPluginClient {
  private readonly apiClient: AxiosInstance;
  private readonly logger = new Logger(AcptPluginClient.name);
  private readonly isConfigured: boolean;
  private readonly baseURL: string;

  private researchersCache: AcptResearcherListItemDto[] | null = null;
  private locationsCache: AcptLocationListItemDto[] | null = null;

  constructor(private readonly configService: ConfigService) {
    this.baseURL = this.configService.get<string>('FDPG_ACPT_PLUGIN_BASE_URL');
    const username = this.configService.get<string>('FDPG_ACPT_USERNAME');
    const password = this.configService.get<string>('FDPG_ACPT_PASSWORD');
    const cloudflareApiToken = this.configService.get<string>('FDPG_ACPT_PLUGIN_CLOUDFLARE_API_TOKEN');
    this.isConfigured = !!(this.baseURL && username && password && cloudflareApiToken);

    if (!this.baseURL) {
      this.logger.warn('FDPG_ACPT_PLUGIN_BASE_URL is not configured. Sync functionality will not work.');
    }

    if (!username || !password) {
      this.logger.warn('ACPT_PLUGIN credentials are not configured. Sync functionality will not work.');
    }

    if (!cloudflareApiToken) {
      this.logger.warn('FDPG_CLOUDFLARE_API_TOKEN is not configured. Sync functionality will not work.');
    }

    this.apiClient = axios.create({
      baseURL: this.baseURL,
      auth: username && password ? { username, password } : undefined,
      timeout: 300000, // 5 minutes for WordPress API (sync involves multiple operations)
      headers: {
        'User-Agent': 'FDPG-API-Client/1.0',
        Accept: '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'x-api-key': cloudflareApiToken ? cloudflareApiToken : '',
      },
    });
  }

  /**
   * Validates that the ACPT Plugin is properly configured
   * @throws Error if configuration is missing
   */
  private validateConfiguration(): void {
    if (!this.isConfigured) {
      throw new Error(
        'ACPT Plugin is not configured. Please set FDPG_ACPT_PLUGIN_BASE_URL, FDPG_ACPT_USERNAME, FDPG_ACPT_PASSWORD, and FDPG_ACPT_PLUGIN_CLOUDFLARE_API_TOKEN in environment variables.',
      );
    }
  }

  /**
   * Create a new project in the ACPT Plugin
   * @param projectData The project data with meta fields
   * @returns The created project with WordPress post ID
   */
  async createProject(projectData: AcptProjectDto): Promise<AcptProjectResponseDto> {
    this.validateConfiguration();

    try {
      this.logger.log(`Creating project in ACPT Plugin: ${projectData.title}`);
      this.logger.log('📤 SENDING PAYLOAD TO ACPT PLUGIN API:');
      this.logger.log(JSON.stringify(projectData, null, 2));

      const response = await this.apiClient.post<AcptProjectResponseDto>('/fdpgx-project', projectData);

      this.logger.log(`✅ Project created successfully with ID: ${response.data.id}`);
      this.logger.log('📥 API RESPONSE:');
      this.logger.log(JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create project: ${error.message}`, error.stack);
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`ACPT Plugin API error: ${error.message}`);
    }
  }

  /**
   * Update an existing project in the ACPT Plugin
   * @param projectId The WordPress post ID
   * @param projectData The updated project data with meta fields
   * @returns The updated project
   */
  async updateProject(projectId: string, projectData: AcptProjectDto): Promise<AcptProjectResponseDto> {
    this.validateConfiguration();

    try {
      this.logger.log(`Updating project in ACPT Plugin: ${projectId}`);
      this.logger.log('📤 SENDING PAYLOAD TO ACPT PLUGIN API:');
      this.logger.log(JSON.stringify(projectData, null, 2));

      const response = await this.apiClient.post<AcptProjectResponseDto>(`/fdpgx-project/${projectId}`, projectData);

      this.logger.log(`✅ Project updated successfully: ${response.data.id}`);
      this.logger.log('📥 API RESPONSE:');
      this.logger.log(JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update project: ${error.message}`, error.stack);
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`ACPT Plugin API error: ${error.message}`);
    }
  }

  /**
   * Check if ACPT Plugin is configured and accessible
   * @returns true if the plugin is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConfigured) {
        return false;
      }

      await this.apiClient.get('/fdpgx-project');
      return true;
    } catch (error) {
      this.logger.warn('ACPT Plugin health check failed', error.message);
      return false;
    }
  }

  /**
   * Get all researchers from WordPress (fetches all pages, cached)
   * @param forceRefresh Force refresh the cache
   * @returns List of researchers
   */
  async getResearchers(forceRefresh: boolean = false): Promise<AcptResearcherListItemDto[]> {
    this.validateConfiguration();

    if (this.researchersCache && !forceRefresh) {
      this.logger.log(`Using cached researchers (${this.researchersCache.length} items)`);
      return this.researchersCache;
    }

    try {
      this.logger.log('Fetching researchers from ACPT Plugin');
      const allResearchers: AcptResearcherListItemDto[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.apiClient.get<AcptResearcherListItemDto[]>('/fdpgx-researcher', {
          params: {
            per_page: 100, // WordPress max per page
            page: page,
          },
        });

        allResearchers.push(...response.data);

        // Check if there are more pages (WordPress returns X-WP-TotalPages header)
        const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
        hasMore = page < totalPages;
        page++;

        if (hasMore) {
          this.logger.log(`Fetched page ${page - 1}/${totalPages}, continuing...`);
        }
      }

      this.logger.log(`Found ${allResearchers.length} researchers across ${page - 1} page(s)`);

      this.researchersCache = allResearchers;

      return allResearchers;
    } catch (error) {
      this.logger.error(`Failed to fetch researchers: ${error.message}`);
      throw new Error(`ACPT Plugin API error: ${error.message}`);
    }
  }

  /**
   * Helper to extract meta field value from ACPT response
   * @param item The ACPT item (researcher, location, etc.)
   * @param fieldName The meta field name to extract
   * @returns The field value or null if not found
   */
  private getMetaFieldValue(
    item: AcptResearcherListItemDto | AcptLocationListItemDto,
    fieldName: string,
  ): string | null {
    if (!item.acpt?.meta) return null;

    for (const metaBox of item.acpt.meta) {
      const field = metaBox.meta_fields?.find((f) => f.name === fieldName);
      if (field) {
        return Array.isArray(field.value) ? field.value.join(' ') : field.value;
      }
    }
    return null;
  }

  /**
   * Find a researcher by first and last name
   * @param firstName The researcher's first name
   * @param lastName The researcher's last name
   * @returns The researcher WordPress post ID if found, null otherwise
   */
  async findResearcherByName(firstName: string, lastName: string): Promise<string | null> {
    const researchers = await this.getResearchers();

    const found = researchers.find((r) => {
      const researcherFirstName = this.getMetaFieldValue(r, 'fdpgx-firstname');
      const researcherLastName = this.getMetaFieldValue(r, 'fdpgx-lastname');

      return (
        researcherFirstName?.toLowerCase() === firstName.toLowerCase() &&
        researcherLastName?.toLowerCase() === lastName.toLowerCase()
      );
    });

    return found ? found.id : null;
  }

  /**
   * Create a new researcher in WordPress
   * @param researcherData The researcher data
   * @returns The created researcher with WordPress post ID
   */
  async createResearcher(researcherData: AcptResearcherDto): Promise<AcptResearcherResponseDto> {
    this.validateConfiguration();

    try {
      this.logger.log(`Creating researcher in ACPT Plugin: ${researcherData.title}`);
      this.logger.log('📤 SENDING RESEARCHER PAYLOAD:');
      this.logger.log(JSON.stringify(researcherData, null, 2));

      const response = await this.apiClient.post<AcptResearcherResponseDto>('/fdpgx-researcher', researcherData);

      this.logger.log(`✅ Researcher created successfully with ID: ${response.data.id}`);

      this.researchersCache = null;

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create researcher: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`ACPT Plugin API error: ${error.message}`);
    }
  }

  /**
   * Get all locations from WordPress (fetches all pages, cached)
   * @param forceRefresh Force refresh the cache
   * @returns List of locations
   */
  async getLocations(forceRefresh: boolean = false): Promise<AcptLocationListItemDto[]> {
    this.validateConfiguration();

    if (this.locationsCache && !forceRefresh) {
      this.logger.log(`Using cached locations (${this.locationsCache.length} items)`);
      return this.locationsCache;
    }

    try {
      this.logger.log('Fetching locations from ACPT Plugin');
      const allLocations: AcptLocationListItemDto[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.apiClient.get<AcptLocationListItemDto[]>('/fdpgx-location', {
          params: {
            per_page: 100, // WordPress max per page
            page: page,
          },
        });

        allLocations.push(...response.data);

        // Check if there are more pages (WordPress returns X-WP-TotalPages header)
        const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
        hasMore = page < totalPages;
        page++;

        if (hasMore) {
          this.logger.log(`Fetched page ${page - 1}/${totalPages}, continuing...`);
        }
      }

      this.logger.log(`Found ${allLocations.length} locations across ${page - 1} page(s)`);

      this.locationsCache = allLocations;

      return allLocations;
    } catch (error) {
      this.logger.error(`Failed to fetch locations: ${error.message}`);
      throw new Error(`ACPT Plugin API error: ${error.message}`);
    }
  }

  /**
   * Find a location by name (searches in fdpgx-name meta field)
   * @param locationName The location name to search for
   * @returns The location WordPress post ID if found, null otherwise
   */
  async findLocationByName(locationName: string): Promise<string | null> {
    const locations = await this.getLocations();

    const found = locations.find((l) => {
      const name = this.getMetaFieldValue(l, 'fdpgx-name');
      return name?.toLowerCase() === locationName.toLowerCase();
    });

    return found ? found.id : null;
  }

  /**
   * Create a new location in WordPress
   * @param locationData The location data
   * @returns The created location with WordPress post ID
   */
  async createLocation(locationData: AcptLocationDto): Promise<AcptLocationResponseDto> {
    this.validateConfiguration();

    try {
      this.logger.log(`Creating location in ACPT Plugin: ${locationData.title}`);
      this.logger.log('📤 SENDING LOCATION PAYLOAD:');
      this.logger.log(JSON.stringify(locationData, null, 2));

      const response = await this.apiClient.post<AcptLocationResponseDto>('/fdpgx-location', locationData);

      this.logger.log(`✅ Location created successfully with ID: ${response.data.id}`);

      this.locationsCache = null;

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create location: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`ACPT Plugin API error: ${error.message}`);
    }
  }

  /**
   * Clear the researchers and locations cache
   * Useful when you need to force a refresh
   */
  clearCache(): void {
    this.logger.log('Clearing researchers and locations cache');
    this.researchersCache = null;
    this.locationsCache = null;
  }
}
