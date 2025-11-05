import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { AcptProjectDto, AcptProjectResponseDto } from '../dto/acpt-plugin/acpt-project.dto';

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
  private readonly isMockMode: boolean;

  constructor(private readonly configService: ConfigService) {
    const baseURL = this.configService.get<string>('ACPT_PLUGIN_BASE_URL');
    const username = this.configService.get<string>('ACPT_PLUGIN_USERNAME');
    const password = this.configService.get<string>('ACPT_PLUGIN_PASSWORD');

    // Enable mock mode if ACPT_PLUGIN_MOCK_MODE is set to 'true'
    this.isMockMode = this.configService.get<string>('ACPT_PLUGIN_MOCK_MODE') === 'true';

    if (this.isMockMode) {
      this.logger.warn('🧪 ACPT Plugin is running in MOCK MODE - API calls will be simulated');
    }

    if (!baseURL && !this.isMockMode) {
      this.logger.warn('ACPT_PLUGIN_BASE_URL is not configured. Sync functionality will not work.');
    }

    if ((!username || !password) && !this.isMockMode) {
      this.logger.warn('ACPT_PLUGIN credentials are not configured. Sync functionality will not work.');
    }

    this.apiClient = axios.create({
      baseURL,
      auth: username && password ? { username, password } : undefined,
      timeout: 60000, // 60 seconds for WordPress API
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
    });
  }

  /**
   * Create a new project in the ACPT Plugin
   * @param projectData The project data with meta fields
   * @returns The created project with WordPress post ID
   */
  async createProject(projectData: AcptProjectDto): Promise<AcptProjectResponseDto> {
    // Mock mode: simulate successful API call
    if (this.isMockMode) {
      const mockId = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      this.logger.log(`🧪 MOCK: Creating project "${projectData.title}" - Generated ID: ${mockId}`);
      this.logger.log('📤 MOCK PAYLOAD THAT WOULD BE SENT:');
      this.logger.log(JSON.stringify(projectData, null, 2));

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        id: mockId,
        status: 'publish',
        message: 'Mock project created successfully',
      };
    }

    try {
      this.logger.log(`Creating project in ACPT Plugin: ${projectData.title}`);
      this.logger.log('📤 SENDING PAYLOAD TO ACPT PLUGIN API:');
      this.logger.log(JSON.stringify(projectData, null, 2));

      const response = await this.apiClient.post<AcptProjectResponseDto>('', projectData);

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
    // Mock mode: simulate successful API call
    if (this.isMockMode) {
      this.logger.log(`🧪 MOCK: Updating project "${projectData.title}" with ID: ${projectId}`);
      this.logger.log('📤 MOCK PAYLOAD THAT WOULD BE SENT:');
      this.logger.log(JSON.stringify(projectData, null, 2));

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        id: projectId,
        status: 'publish',
        message: 'Mock project updated successfully',
      };
    }

    try {
      this.logger.log(`Updating project in ACPT Plugin: ${projectId}`);
      this.logger.log('📤 SENDING PAYLOAD TO ACPT PLUGIN API:');
      this.logger.log(JSON.stringify(projectData, null, 2));

      const response = await this.apiClient.post<AcptProjectResponseDto>(`/${projectId}`, projectData);

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
    // Mock mode: always return true
    if (this.isMockMode) {
      this.logger.log('🧪 MOCK: Health check passed');
      return true;
    }

    try {
      const baseURL = this.configService.get<string>('ACPT_PLUGIN_BASE_URL');
      if (!baseURL) {
        return false;
      }

      // WordPress REST API root endpoint
      await this.apiClient.get('');
      return true;
    } catch (error) {
      this.logger.warn('ACPT Plugin health check failed', error.message);
      return false;
    }
  }
}
