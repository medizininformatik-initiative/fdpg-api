import {
  Body,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Request,
  Res,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { Auth } from 'src/shared/decorators/auth.decorator';
import { MongoIdParamDto, MongoTwoIdsParamDto } from 'src/shared/dto/mongo-id-param.dto';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { createMulterOptions } from 'src/shared/utils/multer-options.util';
import { UploadTypeDto } from '../dto/upload-type.dto';
import { UploadGetDto } from '../dto/upload.dto';
import { DirectUpload } from '../enums/upload-type.enum';
import { ProposalUploadService } from '../services/proposal-upload.service';
import { ProposalMiscService } from '../services/proposal-misc.service';

@ApiController('proposals', undefined, 'upload')
export class ProposalUploadController {
  constructor(
    private readonly proposalUploadService: ProposalUploadService,
    private readonly proposalMiscService: ProposalMiscService,
  ) {}

  @Auth(Role.Researcher, Role.FdpgMember, Role.DataSourceMember)
  @Post(':id/uploads/export')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Returns all proposal uploads as a zip file' })
  @ApiNotFoundResponse({ description: 'Proposal could not be found' })
  async exportAllUploadsAsZip(
    @Param() { id }: MongoIdParamDto,
    @Request() { user }: FdpgRequest,
    @Res() res: Response,
  ) {
    const { zipBuffer, projectAbbreviation } = await this.proposalMiscService.exportAllUploadsAsZip(id, user);

    if (zipBuffer && Buffer.isBuffer(zipBuffer)) {
      const filename = `${projectAbbreviation}.zip`;

      const encodedFilename = encodeURIComponent(filename);
      const contentDisposition = `attachment; filename*=UTF-8''${encodedFilename}`;

      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': contentDisposition,
        'Content-Length': zipBuffer.length,
        'Access-Control-Expose-Headers': 'Content-Disposition, X-Filename',
        'X-Filename': filename,
      });
      return res.status(200).send(zipBuffer);
    } else {
      return res.status(204).send();
    }
  }

  @Auth(Role.Researcher, Role.FdpgMember, Role.DataSourceMember, Role.DizMember, Role.UacMember)
  @Post(':id/upload')
  @UsePipes(ValidationPipe)
  @UseInterceptors(FileInterceptor('file', createMulterOptions()))
  @ApiNotFoundResponse({ description: 'Proposal could not be found' })
  @ApiOperation({ summary: 'Uploads a file to a proposal' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadTypeDto })
  async upload(
    @Param() { id }: MongoIdParamDto,
    @UploadedFile() file: Express.Multer.File,
    @Body() { type }: { type: DirectUpload },
    @Request() { user }: FdpgRequest,
  ): Promise<UploadGetDto> {
    return await this.proposalUploadService.upload(id, file, type, user);
  }

  @Auth(Role.Researcher, Role.FdpgMember, Role.DataSourceMember, Role.DizMember, Role.UacMember)
  @Get(':mainId/upload/:subId')
  @UsePipes(ValidationPipe)
  @ApiNotFoundResponse({ description: 'Upload or proposal could not be found' })
  @ApiOperation({ summary: 'Gets a download url for a proposal upload' })
  async getDownloadLink(
    @Param() { mainId, subId }: MongoTwoIdsParamDto,
    @Request() { user }: FdpgRequest,
  ): Promise<string> {
    return await this.proposalUploadService.getDownloadUrl(mainId, subId, user);
  }

  @Auth(Role.Researcher, Role.FdpgMember, Role.DataSourceMember, Role.DizMember, Role.UacMember)
  @Delete(':mainId/upload/:subId')
  @UsePipes(ValidationPipe)
  @ApiNotFoundResponse({ description: 'Upload or proposal could not be found' })
  @ApiNoContentResponse({ description: 'Item successfully deleted. No content returns.' })
  @HttpCode(204)
  @ApiOperation({ summary: 'Deletes a proposal upload' })
  async deleteUpload(@Param() { mainId, subId }: MongoTwoIdsParamDto, @Request() { user }: FdpgRequest): Promise<void> {
    return await this.proposalUploadService.deleteUploadAndSaveProposal(mainId, subId, user);
  }
}
