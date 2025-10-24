import { Body, Get, Param, Post, Request } from '@nestjs/common';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { LocationSyncService } from './service/location-sync.service';
import { LocationService } from './service/location.service';
import { LocationSyncChangelogService } from './service/location-sync-changelog.service';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { MongoIdParamDto } from 'src/shared/dto/mongo-id-param.dto';
import { LocationDto, LocationKeyLabelDto } from './dto/location.dto';
import { LocationSyncChangelogDto } from './dto/location-sync-changelog.dto';
import { Auth } from 'src/shared/decorators/auth.decorator';
import { Role } from 'src/shared/enums/role.enum';

@ApiController('locations')
export class LocationController {
  constructor(
    private locationSyncService: LocationSyncService,
    private locationService: LocationService,
    private locationSyncChangelogService: LocationSyncChangelogService,
  ) {}

  @Get('/key-label')
  async getAllForKeyLabels(): Promise<LocationKeyLabelDto[]> {
    const result = await this.locationService.findAllKeyLabel();
    return result;
  }

  @Get()
  @Auth(...Object.values(Role))
  async getAll(): Promise<LocationDto[]> {
    return await this.locationService.findAll();
  }

  @Post('/:id')
  @Auth(Role.FdpgMember)
  async updateLocation(@Param() { id }: MongoIdParamDto, @Body() locationDto: LocationDto): Promise<void> {
    await this.locationService.update(id, locationDto);
  }

  @Get('/sync')
  @Auth(Role.FdpgMember, Role.Admin)
  async syncLocations(): Promise<LocationSyncChangelogDto[]> {
    await this.locationSyncService.syncLocations();
    return await this.locationSyncChangelogService.findAll();
  }

  @Get('/changelogs')
  @Auth(Role.FdpgMember)
  async getAllChangeLogs(): Promise<LocationSyncChangelogDto[]> {
    return await this.locationSyncChangelogService.findAll();
  }

  @Post('/changelogs/:id/status')
  @Auth(Role.FdpgMember)
  async setChangelogStatus(
    @Param() { id }: MongoIdParamDto,
    @Body() changelogDto: LocationSyncChangelogDto,
    @Request() { user }: FdpgRequest,
  ): Promise<LocationSyncChangelogDto> {
    return await this.locationSyncService.setChangelogStatus(id, changelogDto, user);
  }
}
