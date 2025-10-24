import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Location, LocationDocument } from '../schema/location.schema';
import { Model } from 'mongoose';
import { plainToClass } from 'class-transformer';
import { LocationDto, LocationKeyLabelDto } from '../dto/location.dto';
import { mergeDeep } from 'src/modules/proposal/utils/merge-proposal.util';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheKey } from 'src/shared/enums/cache-key.enum';

@Injectable()
export class LocationService {
  constructor(
    @InjectModel(Location.name)
    private locationModel: Model<LocationDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private readonly CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  async findById(id: string): Promise<LocationDocument> {
    return await this.locationModel.findById(id);
  }

  async findAllDocuments(): Promise<LocationDocument[]> {
    return await this.locationModel.find({});
  }

  async findAll(): Promise<LocationDto[]> {
    return await this.getOrCreateCached(CacheKey.MiiLocations, async () =>
      (await this.findAllDocuments()).map((model) => model.toObject() as Location).map(this.modelToDto),
    );
  }

  async findAllKeyLabel(): Promise<LocationKeyLabelDto[]> {
    return await this.getOrCreateCached(CacheKey.MiiLocationsKeyLabel, async () =>
      (await this.findAll()).map((loc) => {
        const dto = new LocationKeyLabelDto();
        dto.locationKey = loc._id;
        dto.locationLabel = loc.display;
        return dto;
      }),
    );
  }

  async update(id: string, location: Location): Promise<LocationDto> {
    const doc = await this.findById(id);

    location.updated = new Date();
    const saved = await (async () => {
      if (doc) {
        mergeDeep(doc, location);
        return await doc.save();
      } else {
        return this.locationModel.insertOne(location);
      }
    })();

    await this.cacheManager.del(CacheKey.MiiLocations);
    await this.cacheManager.del(CacheKey.MiiLocationsKeyLabel);

    const locModel = saved.toObject() as Location;
    return this.modelToDto(locModel);
  }

  private async getOrCreateCached<T>(cacheKey: CacheKey, fetchCb: () => Promise<T[]>): Promise<T[]> {
    const cached = await this.cacheManager.get<T[]>(cacheKey);

    if (!cached || cached.length === 0) {
      const freshData = await fetchCb();
      await this.cacheManager.set(cacheKey, freshData, this.CACHE_DURATION_MS);
      return freshData;
    }

    return cached;
  }

  modelToDto(location: Location): LocationDto {
    return plainToClass(LocationDto, location);
  }
}
