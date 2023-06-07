import {
  Body,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiNotFoundResponse, ApiOperation } from '@nestjs/swagger';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { Auth } from 'src/shared/decorators/auth.decorator';
import { MongoIdParamDto, MongoIdQueryDto } from 'src/shared/dto/mongo-id-param.dto';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { SortOrderDto } from 'src/shared/dto/sort-order.dto';
import { ProposalValidation } from '../decorators/validation.decorator';
import { ProposalFilterDto } from '../dto/proposal-filter.dto';
import { ProposalCreateDto, ProposalGetDto, ProposalGetListDto, ProposalUpdateDto } from '../dto/proposal/proposal.dto';
import { ProposalCrudService } from '../services/proposal-crud.service';
import { CheckUniqueProposalDto } from '../dto/check-unique-proposal.dto';

@ApiController('proposals', undefined, 'crud')
export class ProposalCrudController {
  constructor(private readonly proposalCrudService: ProposalCrudService) {}

  @Auth(Role.Researcher)
  @Post()
  @ProposalValidation(true)
  @ApiOperation({ summary: 'Creates a Proposal' })
  async create(
    @Body() createProposalDto: ProposalCreateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<ProposalGetDto> {
    return await this.proposalCrudService.create(createProposalDto, user);
  }

  @Auth(Role.Researcher, Role.FdpgMember, Role.DizMember, Role.UacMember)
  @Get(':id')
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiOperation({ summary: 'Gets a Proposal by its id' })
  @ProposalValidation()
  async find(@Param() { id }: MongoIdParamDto, @Request() { user }: FdpgRequest) {
    return await this.proposalCrudService.find(id, user);
  }

  @Auth(Role.Researcher, Role.FdpgMember, Role.DizMember, Role.UacMember)
  @Get()
  @ApiOperation({ summary: 'Gets all Proposals that are currently accessible for the user' })
  @UsePipes(ValidationPipe)
  async findAll(
    @Query() sortOrder: SortOrderDto,
    @Query() { panelQuery }: ProposalFilterDto,
    @Request() { user }: FdpgRequest,
  ): Promise<ProposalGetListDto[]> {
    return await this.proposalCrudService.findAll(sortOrder, panelQuery, user);
  }

  @Auth(Role.Researcher)
  @Put(':id')
  @ApiNotFoundResponse({ description: 'Item to update could not be found' })
  @ProposalValidation()
  @ApiOperation({ summary: 'Updates a Proposal' })
  async update(
    @Param() { id }: MongoIdParamDto,
    @Body() updateProposalDto: ProposalUpdateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<ProposalGetDto> {
    return this.proposalCrudService.update(id, updateProposalDto, user);
  }

  @Auth(Role.Researcher, Role.FdpgMember)
  @Delete(':id')
  @ApiNoContentResponse({ description: 'Item successfully deleted. No content returns.' })
  @HttpCode(204)
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Deletes a Proposal' })
  async delete(@Param() { id }: MongoIdParamDto, @Request() { user }: FdpgRequest): Promise<void> {
    await this.proposalCrudService.delete(id, user);
  }

  @Auth(Role.Researcher)
  @Post(':id/duplicate')
  @UsePipes(ValidationPipe)
  @ApiNotFoundResponse({ description: 'Item to duplicate could not be found' })
  @ApiOperation({ summary: 'Duplicates a proposal' })
  async duplicate(@Param() { id }: MongoIdParamDto, @Request() { user }: FdpgRequest): Promise<ProposalGetDto> {
    return await this.proposalCrudService.duplicate(id, user);
  }

  @Auth(Role.Researcher, Role.FdpgMember)
  @Post('is-unique')
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Checks if the provided projectAbbreviation is unique' })
  async checkUnique(
    @Body() checkUniqueProposalDto: CheckUniqueProposalDto,
    @Query() { id }: MongoIdQueryDto,
  ): Promise<boolean> {
    return await this.proposalCrudService.checkUnique(checkUniqueProposalDto, id);
  }
}
