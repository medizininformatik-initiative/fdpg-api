import { describeWithMongo, MongoTestContext } from 'src/test/mongo-test.helper';
import { LocationModule } from '../location.module';
import { LocationService } from '../service/location.service';
import { Model } from 'mongoose';
import { Location } from '../schema/location.schema';
import { getModelToken } from '@nestjs/mongoose';

describeWithMongo('LocationServiceIT', [LocationModule], [], (getContext) => {
  let context: MongoTestContext;
  let locationService: LocationService;
  let locationModel: Model<Location>;

  beforeEach(async () => {
    context = getContext();

    locationService = context.app.get<LocationService>(LocationService);
    locationModel = context.app.get<Model<Location>>(getModelToken(Location.name));

    await locationModel.deleteMany({});
  });

  it('should insert and find one', async () => {
    const newLocation: Location = {
      _id: 'LEJ',
      externalCode: 'LEJ',
      display: 'LEIPZIG',
      consortium: 'consortium',
      dataIntegrationCenter: false,
      dataManagementCenter: false,
      deprecated: false,
    };

    await locationModel.create(newLocation);

    const allLocations = await locationService.findAll();

    expect(allLocations).toHaveLength(1);
    expect(allLocations[0]._id).toBe(newLocation._id);
    expect(allLocations[0].display).toBe(newLocation.display);
  });

  it('should update', async () => {
    const newLocation: Location = {
      _id: 'LEJ',
      externalCode: 'LEJ',
      display: 'LEIPZIG',
      consortium: 'consortium',
      dataIntegrationCenter: false,
      dataManagementCenter: false,
      deprecated: false,
    };

    await locationModel.create(newLocation);

    const updated: Location = {
      _id: newLocation._id,
      externalCode: 'LEJ2',
      display: 'DISPLAY2',
      definition: 'DEFINITION2',
      consortium: 'CONSORTIUM2',
      contract: 'CONTRACT2',
      abbreviation: 'ABBR2',
      dataIntegrationCenter: true,
      dataManagementCenter: true,
      rubrum: 'rubrum',
      deprecated: false,
    };

    await locationService.update(updated._id, updated);

    const allLocations = await locationService.findAll();

    expect(allLocations).toHaveLength(1);
    expect(allLocations[0]._id).toBe(updated._id);
    expect(allLocations[0].externalCode).toBe(updated.externalCode);
    expect(allLocations[0].display).toBe(updated.display);
    expect(allLocations[0].consortium).toBe(updated.consortium);
    expect(allLocations[0].contract).toBe(updated.contract);
    expect(allLocations[0].abbreviation).toBe(updated.abbreviation);
    expect(allLocations[0].dataIntegrationCenter).toBe(updated.dataManagementCenter);
    expect(allLocations[0].dataManagementCenter).toBe(updated.dataManagementCenter);
    expect(allLocations[0].rubrum).toBe(updated.rubrum);
  });
});
