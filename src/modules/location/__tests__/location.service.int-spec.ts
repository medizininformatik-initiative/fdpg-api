import { describeWithMongo, MongoTestContext } from 'src/test/mongo-test.helper';
import { LocationService } from '../service/location.service';
import { Model } from 'mongoose';
import { Location, LocationSchema } from '../schema/location.schema';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describeWithMongo(
  'LocationServiceIT',
  [
    MongooseModule.forFeature([{ name: Location.name, schema: LocationSchema }]),
    CacheModule.register(),
    LocationService,
  ],
  (getContext) => {
    let context: MongoTestContext;
    let locationService: LocationService;
    let locationModel: Model<Location>;
    let cacheManager: Cache;

    beforeEach(async () => {
      context = getContext();

      locationService = context.app.get<LocationService>(LocationService);
      locationModel = context.app.get<Model<Location>>(getModelToken(Location.name));
      cacheManager = context.app.get<Cache>(CACHE_MANAGER);

      // Clear cache to prevent data leakage between tests
      await cacheManager.clear();
    });

    it('should create/update and find location via service', async () => {
      const newLocation: Location = {
        _id: 'LEJ',
        externalCode: 'LEJ',
        display: 'LEIPZIG',
        consortium: 'consortium',
        dataIntegrationCenter: false,
        dataManagementCenter: false,
        deprecated: false,
      };

      // Create via update (when doesn't exist)
      await locationService.update(newLocation._id, newLocation);

      const allLocations = await locationService.findAll();

      expect(allLocations).toHaveLength(1);
      expect(allLocations[0]._id).toBe(newLocation._id);
      expect(allLocations[0].display).toBe(newLocation.display);
    });

    it('should update existing location via service', async () => {
      const newLocation: Location = {
        _id: 'LEJ',
        externalCode: 'LEJ',
        display: 'LEIPZIG',
        consortium: 'consortium',
        dataIntegrationCenter: false,
        dataManagementCenter: false,
        deprecated: false,
      };

      await locationService.update(newLocation._id, newLocation);

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
      expect(allLocations[0].dataIntegrationCenter).toBe(updated.dataIntegrationCenter);
      expect(allLocations[0].dataManagementCenter).toBe(updated.dataManagementCenter);
      expect(allLocations[0].rubrum).toBe(updated.rubrum);
    });

    it('should find location by ID via service', async () => {
      const newLocation: Location = {
        _id: 'UKL',
        externalCode: 'UKL',
        display: 'Universitätsklinikum Leipzig',
        consortium: 'SMITH',
        dataIntegrationCenter: true,
        dataManagementCenter: false,
        deprecated: false,
      };

      await locationService.update(newLocation._id, newLocation);

      const found = await locationService.findById('UKL');

      expect(found).toBeDefined();
      expect(found?._id).toBe('UKL');
      expect(found?.display).toBe('Universitätsklinikum Leipzig');
    });

    it('should return null for non-existent location', async () => {
      const found = await locationService.findById('NONEXISTENT');

      expect(found).toBeNull();
    });

    it('should find all locations via service', async () => {
      const locations: Location[] = [
        {
          _id: 'UKL',
          externalCode: 'UKL',
          display: 'Leipzig',
          consortium: 'SMITH',
          dataIntegrationCenter: true,
          dataManagementCenter: false,
          deprecated: false,
        },
        {
          _id: 'UKB',
          externalCode: 'UKB',
          display: 'Bonn',
          consortium: 'SMITH',
          dataIntegrationCenter: false,
          dataManagementCenter: true,
          deprecated: false,
        },
        {
          _id: 'UKE',
          externalCode: 'UKE',
          display: 'Essen',
          consortium: 'HiGHMed',
          dataIntegrationCenter: true,
          dataManagementCenter: true,
          deprecated: false,
        },
      ];

      for (const loc of locations) {
        await locationService.update(loc._id, loc);
      }

      const allLocations = await locationService.findAll();

      expect(allLocations).toHaveLength(3);
      expect(allLocations.map((l) => l._id)).toContain('UKL');
      expect(allLocations.map((l) => l._id)).toContain('UKB');
      expect(allLocations.map((l) => l._id)).toContain('UKE');
    });

    it('should find all locations as key-label pairs', async () => {
      const locations: Location[] = [
        {
          _id: 'UKL',
          externalCode: 'UKL',
          display: 'Leipzig',
          consortium: 'SMITH',
          dataIntegrationCenter: true,
          dataManagementCenter: false,
          deprecated: false,
        },
        {
          _id: 'UKB',
          externalCode: 'UKB',
          display: 'Bonn',
          consortium: 'SMITH',
          dataIntegrationCenter: false,
          dataManagementCenter: true,
          deprecated: false,
        },
      ];

      for (const loc of locations) {
        await locationService.update(loc._id, loc);
      }

      const keyLabels = await locationService.findAllKeyLabel();

      expect(keyLabels).toHaveLength(2);
      expect(keyLabels[0]).toHaveProperty('_id');
      expect(keyLabels[0]).toHaveProperty('display');
      expect(keyLabels.find((l) => l._id === 'UKL')?.display).toBe('Leipzig');
    });

    it('should find all locations as lookup map', async () => {
      const locations: Location[] = [
        {
          _id: 'UKL',
          externalCode: 'UKL',
          display: 'Leipzig',
          consortium: 'SMITH',
          dataIntegrationCenter: true,
          dataManagementCenter: false,
          deprecated: false,
        },
        {
          _id: 'UKB',
          externalCode: 'UKB',
          display: 'Bonn',
          consortium: 'SMITH',
          dataIntegrationCenter: false,
          dataManagementCenter: true,
          deprecated: false,
        },
      ];

      for (const loc of locations) {
        await locationService.update(loc._id, loc);
      }

      const lookupMap = await locationService.findAllLookUpMap();

      expect(Object.keys(lookupMap)).toHaveLength(2);
      expect(lookupMap['UKL']).toBeDefined();
      expect(lookupMap['UKL'].display).toBe('Leipzig');
      expect(lookupMap['UKB']).toBeDefined();
      expect(lookupMap['UKB'].display).toBe('Bonn');
    });

    it('should create a new location via update when it does not exist', async () => {
      const newLocation: Location = {
        _id: 'NEW',
        externalCode: 'NEW',
        display: 'New Location',
        consortium: 'SMITH',
        dataIntegrationCenter: false,
        dataManagementCenter: false,
        deprecated: false,
      };

      const result = await locationService.update('NEW', newLocation);

      expect(result._id).toBe('NEW');
      expect(result.display).toBe('New Location');

      // Verify via service
      const found = await locationService.findById('NEW');
      expect(found).toBeDefined();
    });

    it('should handle locations with optional fields via service', async () => {
      const minimalLocation: Location = {
        _id: 'MIN',
        externalCode: 'MIN',
        display: 'Minimal',
        consortium: 'TEST',
        dataIntegrationCenter: false,
        dataManagementCenter: false,
        deprecated: false,
      };

      await locationService.update(minimalLocation._id, minimalLocation);

      const fullLocation: Location = {
        _id: 'FULL',
        externalCode: 'FULL',
        display: 'Full Location',
        definition: 'Full definition',
        consortium: 'TEST',
        contract: 'Contract123',
        abbreviation: 'FL',
        uri: 'https://example.com',
        rubrum: 'Rubrum text',
        dataIntegrationCenter: true,
        dataManagementCenter: true,
        deprecated: false,
      };

      await locationService.update(fullLocation._id, fullLocation);

      const all = await locationService.findAll();

      expect(all).toHaveLength(2);
      const minimal = all.find((l) => l._id === 'MIN');
      const full = all.find((l) => l._id === 'FULL');

      expect(minimal?.contract).toBeUndefined();
      expect(full?.contract).toBe('Contract123');
      expect(full?.abbreviation).toBe('FL');
      expect(full?.uri).toBe('https://example.com');
    });
  },
);
