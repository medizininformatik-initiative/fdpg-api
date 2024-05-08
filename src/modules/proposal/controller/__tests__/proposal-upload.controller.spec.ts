import { Test } from '@nestjs/testing';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { UploadGetDto } from '../../dto/upload.dto';
import { DirectUpload } from '../../enums/upload-type.enum';
import { ProposalUploadController } from '../proposal-upload.controller';
import { ProposalUploadService } from '../../services/proposal-upload.service';

const moduleMocker = new ModuleMocker(global);

describe('ProposalUploadController', () => {
  let proposalUploadController: ProposalUploadController;
  let proposalUploadService: ProposalUploadService;

  const request = {
    user: {
      userId: 'string',
      firstName: 'string',
      lastName: 'string',
      fullName: 'string',
      email: 'string',
      username: 'string',
      email_verified: true,
      roles: [Role.Researcher],
      singleKnownRole: Role.Researcher,
      isFromLocation: false,
      isKnownLocation: false,
    },
  } as FdpgRequest;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProposalUploadController],
    })
      .useMocker((token) => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    proposalUploadService = moduleRef.get<ProposalUploadService>(ProposalUploadService);
    proposalUploadController = moduleRef.get<ProposalUploadController>(ProposalUploadController);
  });

  describe('upload', () => {
    it('should upload the file', async () => {
      const params = {
        id: 'mongoId',
      };
      const input = { type: DirectUpload.GeneralAppendix };
      const result = new UploadGetDto();
      const file: Express.Multer.File = { filename: 'test' } as Express.Multer.File;

      jest.spyOn(proposalUploadService, 'upload').mockResolvedValue(result);

      expect(await proposalUploadController.upload(params, file, input, request)).toBe(result);
      expect(proposalUploadService.upload).toHaveBeenCalledWith(params.id, file, input.type, request.user);
    });
  });

  describe('getDownloadLink', () => {
    it('should return the download link', async () => {
      const params = {
        mainId: 'mainId-mongoId',
        subId: 'subId-mongoId',
      };
      const result = 'some-url';
      jest.spyOn(proposalUploadService, 'getDownloadUrl').mockResolvedValue(result);

      const call = proposalUploadController.getDownloadLink(params, request);
      expect(await call).toBe(result);
      expect(proposalUploadService.getDownloadUrl).toHaveBeenCalledWith(params.mainId, params.subId, request.user);
    });
  });

  describe('deleteUpload', () => {
    it('should delete the upload', async () => {
      const params = {
        mainId: 'mainId-mongoId',
        subId: 'subId-mongoId',
      };

      jest.spyOn(proposalUploadService, 'deleteUpload');

      await proposalUploadController.deleteUpload(params, request);
      expect(proposalUploadService.saveDeletedUpload).toHaveBeenCalledWith(params.mainId, params.subId, request.user);
    });
  });
});
