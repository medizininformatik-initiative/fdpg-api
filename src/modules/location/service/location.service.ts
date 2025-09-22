import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Location, LocationDocument } from '../schema/location.schema';
import { Model } from 'mongoose';
import { plainToClass } from 'class-transformer';
import { LocationGetDto } from '../dto/location-get.dto';

@Injectable()
export class LocationService {
  constructor(
    @InjectModel(Location.name)
    private locationModel: Model<LocationDocument>,
  ) {}

  async findAllDocuments(): Promise<LocationDocument[]> {
    return await this.locationModel.find({});
  }

  async findAll(): Promise<LocationGetDto[]> {
    const all = (await this.findAllDocuments()).map((model) => model.toObject());

    return all.map((obj) => plainToClass(LocationGetDto, obj));
  }
}
