import { Test, TestingModule } from '@nestjs/testing';
import { AzureStorageService } from 'src/modules/azure-storage/azure-storage.service';
import { ProposalCrudService } from '../proposal-crud.service';
import { ProposalUploadService } from '../proposal-upload.service';

describe('ProposalUploadService', () => {
  let proposalUploadService: ProposalUploadService;

  let proposalCrudService: jest.Mocked<ProposalCrudService>;
  let azureStorageService: jest.Mocked<AzureStorageService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalUploadService,
        {
          provide: ProposalCrudService,
          useValue: {
            findDocument: jest.fn(),
          },
        },
        {
          provide: AzureStorageService,
          useValue: {
            handleSomething: jest.fn(),
          },
        },
      ],
      imports: [],
    }).compile();

    proposalUploadService = module.get<ProposalUploadService>(ProposalUploadService);
    proposalCrudService = module.get<ProposalCrudService>(ProposalCrudService) as jest.Mocked<ProposalCrudService>;
    azureStorageService = module.get<AzureStorageService>(AzureStorageService) as jest.Mocked<AzureStorageService>;
  });

  it('should be defined', () => {
    expect(proposalUploadService).toBeDefined();
  });
});
