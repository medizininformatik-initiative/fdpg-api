import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from 'src/modules/storage/storage.service';
import { ProposalCrudService } from '../proposal-crud.service';
import { ProposalUploadService } from '../proposal-upload.service';

describe('ProposalUploadService', () => {
  let proposalUploadService: ProposalUploadService;

  let proposalCrudService: jest.Mocked<ProposalCrudService>;
  let storageService: jest.Mocked<StorageService>;

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
          provide: StorageService,
          useValue: {
            handleSomething: jest.fn(),
          },
        },
      ],
      imports: [],
    }).compile();

    proposalUploadService = module.get<ProposalUploadService>(ProposalUploadService);
    proposalCrudService = module.get<ProposalCrudService>(ProposalCrudService) as jest.Mocked<ProposalCrudService>;
    storageService = module.get<StorageService>(StorageService) as jest.Mocked<StorageService>;
  });

  it('should be defined', () => {
    expect(proposalUploadService).toBeDefined();
  });
});
