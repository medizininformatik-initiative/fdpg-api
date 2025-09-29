import { describeWithMongo, MongoTestContext } from 'src/test/mongo-test.helper';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { ProposalModule } from '../../proposal.module';
import { Location } from 'src/modules/location/schema/location.schema';
import { LocationService } from 'src/modules/location/service/location.service';
import { LocationModule } from 'src/modules/location/location.module';
import { ProposalCrudService } from '../proposal-crud.service';
import { Proposal } from '../../schema/proposal.schema';
import { KeycloakClient } from 'src/modules/user/keycloak.client';
import { FeasibilityAuthenticationClient } from 'src/modules/feasibility/feasibility-authentication.client';
import { forwardRef } from '@nestjs/common';
import { StorageService } from 'src/modules/storage/storage.service';

describeWithMongo(
  'ProposalCrudServiceIT',
  [forwardRef(() => ProposalModule), LocationModule],
  [
    { provide: FeasibilityAuthenticationClient, useValue: { obtainToken: jest.fn() } },
    { provide: KeycloakClient, useValue: { obtainToken: jest.fn() } },
    { provide: StorageService, useValue: {} },
  ],
  (getContext) => {
    let context: MongoTestContext;
    let locationService: LocationService;
    let locationModel: Model<Location>;
    let proposalCrudService: ProposalCrudService;
    let proposalModel: Model<Proposal>;

    beforeEach(async () => {
      context = getContext();

      locationService = context.app.get<LocationService>(LocationService);
      locationModel = context.app.get<Model<Location>>(getModelToken(Location.name));

      proposalCrudService = context.app.get<ProposalCrudService>(ProposalCrudService);
      proposalModel = context.app.get<Model<Proposal>>(getModelToken(Proposal.name));

      await proposalModel.deleteMany({});
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
    });
  },
);
