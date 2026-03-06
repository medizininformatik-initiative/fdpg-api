import { Injectable } from '@nestjs/common';
import { MiiCodesystemClient } from '../client/mii-codesystem.client';
import { AxiosInstance } from 'axios';
import { MiiCodesystemLocationDto } from '../dto/mii-codesystem-location.dto';

@Injectable()
export class LocationFetchService {
  constructor(private miiCodesystemClient: MiiCodesystemClient) {
    this.apiClient = this.miiCodesystemClient.client;
  }

  private apiClient: AxiosInstance;
  private readonly propertyValueKeyMap = {
    string: 'valueString',
    code: 'valueCode',
    boolean: 'valueBoolean',
    date: 'valueDateTime',
  };

  async fetchLocationsFromApi(): Promise<MiiCodesystemLocationDto[]> {
    const response = await this.apiClient.get('');

    const miiCodesystemLocationDtos: MiiCodesystemLocationDto[] =
      response.data?.concept
        ?.filter?.((apiDto: unknown) => apiDto)
        ?.filter?.((apiDto: Record<string, unknown>) => apiDto.code)
        .map?.(
          (apiDto: Record<string, unknown>) =>
            ({
              code: apiDto.code,
              display: apiDto.display,
              definition: apiDto.definition,
              consortium: this.getPropertyValue(apiDto, 'consortium', 'string'),
              uri: this.getPropertyValue(apiDto, 'uri', 'string'),
              status: (this.getPropertyValue(apiDto, 'status', 'code') as string | undefined)?.toLowerCase(),
              contract: this.getPropertyValue(apiDto, 'contract', 'string'),
              abbreviation: this.getPropertyValue(apiDto, 'abbreviation', 'string'),
              dic: this.getPropertyValue(apiDto, 'dic', 'boolean') ?? false,
              dataManagement: this.getPropertyValue(apiDto, 'dataManagement', 'boolean') ?? false,
              deprecationDate: this.getPropertyValue(apiDto, 'deprecationDate', 'date'),
              replaces: this.getPropertyValue(apiDto, 'replaces', 'code'),
              replacedBy: this.getPropertyValue(apiDto, 'replacedBy', 'code'),
            }) as MiiCodesystemLocationDto,
        ) ??
      (() => {
        throw new Error(`Invalid API response: ${JSON.stringify(response.data ?? 'empty response')}`);
      })();

    return miiCodesystemLocationDtos;
  }

  private getPropertyValue(
    apiDto: Record<string, unknown>,
    propertyName: keyof MiiCodesystemLocationDto,
    expectedType: 'code' | 'string' | 'boolean' | 'date',
  ): string | boolean | undefined {
    const properties = apiDto.property as Array<Record<string, unknown>> | undefined;
    const property = properties?.find((entry: Record<string, unknown>) => entry.code === propertyName);
    const propertyKey = this.propertyValueKeyMap[expectedType];
    return property?.[propertyKey] as string | boolean | undefined;
  }
}
