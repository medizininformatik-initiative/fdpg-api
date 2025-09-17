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
        ?.filter?.((apiDto: any) => apiDto)
        .map?.(
          (apiDto: any) =>
            ({
              code: apiDto.code,
              display: apiDto.display,
              definition: apiDto.definition,
              consortium: this.getPropertyValue(apiDto, 'consortium', 'string'),
              uri: this.getPropertyValue(apiDto, 'uri', 'string'),
              status: this.getPropertyValue(apiDto, 'status', 'code'),
              contract: this.getPropertyValue(apiDto, 'contract', 'string'),
              abbreviation: this.getPropertyValue(apiDto, 'abbreviation', 'string'),
              dic: this.getPropertyValue(apiDto, 'dic', 'boolean') ?? false,
              dataManagement: this.getPropertyValue(apiDto, 'dataManagement', 'boolean') ?? false,
              deprecationDate: this.getPropertyValue(apiDto, 'deprecationDate', 'date'),
              replaces: this.getPropertyValue(apiDto, 'replaces', 'code'),
              replacedBy: this.getPropertyValue(apiDto, 'replacedBy', 'code'),
            }) as MiiCodesystemLocationDto,
        ) || [];

    return miiCodesystemLocationDtos;
  }

  private getPropertyValue(
    apiDto: any,
    propertyName: keyof MiiCodesystemLocationDto,
    expectedType: 'code' | 'string' | 'boolean' | 'date',
  ): string | boolean | undefined {
    const property = apiDto.property.find((entry: { code: string }) => entry.code === propertyName);
    const propertyKey = this.propertyValueKeyMap[expectedType];
    return property?.[propertyKey];
  }
}
