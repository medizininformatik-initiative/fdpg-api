import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Location, LocationDocument } from '../schema/location.schema';
import { Model } from 'mongoose';
import { plainToClass } from 'class-transformer';
import { LocationDto } from '../dto/location.dto';
import { mergeDeep } from 'src/modules/proposal/utils/merge-proposal.util';

@Injectable()
export class LocationService {
  constructor(
    @InjectModel(Location.name)
    private locationModel: Model<LocationDocument>,
  ) {}

  async findById(id: string): Promise<LocationDocument> {
    return await this.locationModel.findById(id);
  }

  async findAllDocuments(): Promise<LocationDocument[]> {
    return await this.locationModel.find({});
  }

  async findAll(): Promise<LocationDto[]> {
    return (await this.findAllDocuments()).map((model) => model.toObject() as Location).map(this.modelToDto);
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

    const locModel = saved.toObject() as Location;
    return this.modelToDto(locModel);
  }

  modelToDto(location: Location): LocationDto {
    return plainToClass(LocationDto, location);
  }
}
