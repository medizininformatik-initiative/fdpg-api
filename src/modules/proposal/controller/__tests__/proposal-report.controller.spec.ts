import { Test } from '@nestjs/testing';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { MongoIdParamDto, MongoTwoIdsParamDto } from 'src/shared/dto/mongo-id-param.dto';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { ReportCreateDto, ReportGetDto, ReportUpdateDto } from '../../dto/proposal/report.dto';
import { ProposalReportController } from '../proposal-reports.controller';
import { ProposalReportService } from '../../services/proposal-report.service';

const moduleMocker = new ModuleMocker(global);

describe('ProposalReportController', () => {
  let proposalReportController: ProposalReportController;
  let proposalReportService: ProposalReportService;

  const fdpgRequest = {
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

  const mongoTwoIdsParamDto = new MongoTwoIdsParamDto();
  mongoTwoIdsParamDto.mainId = 'mainId';
  mongoTwoIdsParamDto.subId = 'subId';

  const mongoIdParamDto = new MongoIdParamDto();
  mongoIdParamDto.id = 'id';

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProposalReportController],
    })
      .useMocker((token) => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    proposalReportService = moduleRef.get<ProposalReportService>(ProposalReportService);
    proposalReportController = moduleRef.get<ProposalReportController>(ProposalReportController);
  });

  describe('createReport', () => {
    it('should create a report and add it to the proposal', async () => {
      const reportCreateDto = new ReportCreateDto();
      const reportGetDto = new ReportGetDto();
      const file: Express.Multer.File = { filename: 'test' } as Express.Multer.File;
      const files = [file];

      jest.spyOn(proposalReportService, 'createReport').mockResolvedValueOnce(reportGetDto);

      const result = await proposalReportController.createReport(mongoIdParamDto, files, reportCreateDto, fdpgRequest);

      expect(proposalReportService.createReport).toHaveBeenCalledWith(
        mongoIdParamDto.id,
        reportCreateDto,
        files,
        fdpgRequest.user,
      );
      expect(result).toEqual(reportGetDto);
    });
  });

  describe('getAllReports', () => {
    it('should return reports for a proposal', async () => {
      const reportGetDto = new ReportGetDto();
      jest.spyOn(proposalReportService, 'getAllReports').mockResolvedValueOnce([reportGetDto]);

      const result = await proposalReportController.getAllReports(mongoIdParamDto, fdpgRequest);

      expect(proposalReportService.getAllReports).toHaveBeenCalledWith(mongoIdParamDto.id, fdpgRequest.user);
      expect(result).toEqual([reportGetDto]);
    });
  });

  describe('getReportContent', () => {
    it('should return report content for a proposal', async () => {
      const content = 'content';
      jest.spyOn(proposalReportService, 'getReportContent').mockResolvedValueOnce(content);

      const result = await proposalReportController.getReportContent(mongoTwoIdsParamDto, fdpgRequest);

      expect(proposalReportService.getReportContent).toHaveBeenCalledWith(
        mongoTwoIdsParamDto.mainId,
        mongoTwoIdsParamDto.subId,
        fdpgRequest.user,
      );

      expect(result).toEqual(content);
    });
  });

  describe('updateReport', () => {
    it('should update reports for a proposal', async () => {
      const reportUpdateDto = new ReportUpdateDto();
      const reportGetDto = new ReportGetDto();
      const file: Express.Multer.File = { filename: 'test' } as Express.Multer.File;
      const files = [file];
      jest.spyOn(proposalReportService, 'updateReport').mockResolvedValueOnce(reportGetDto);

      const result = await proposalReportController.updateReport(
        mongoTwoIdsParamDto,
        files,
        reportUpdateDto,
        fdpgRequest,
      );

      expect(proposalReportService.updateReport).toHaveBeenCalledWith(
        mongoTwoIdsParamDto.mainId,
        mongoTwoIdsParamDto.subId,
        reportUpdateDto,
        files,
        fdpgRequest.user,
      );

      expect(result).toEqual(reportGetDto);
    });
  });

  describe('deleteReport', () => {
    it('should delete a report from a proposal', async () => {
      jest.spyOn(proposalReportService, 'deleteReport').mockResolvedValue();

      await proposalReportController.deleteReport(mongoTwoIdsParamDto, fdpgRequest);
      expect(proposalReportService.deleteReport).toHaveBeenCalledWith(
        mongoTwoIdsParamDto.mainId,
        mongoTwoIdsParamDto.subId,
        fdpgRequest.user,
      );
    });
  });
});
