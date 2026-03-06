import { Body, Delete, Get, HttpCode, Param, Post, Put, Request, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiNoContentResponse, ApiNotFoundResponse, ApiOperation } from '@nestjs/swagger';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { Auth } from 'src/shared/decorators/auth.decorator';
import { MongoIdParamDto, MongoTwoIdsParamDto } from 'src/shared/dto/mongo-id-param.dto';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { ProposalValidation } from '../decorators/validation.decorator';
import { PublicationCreateDto, PublicationGetDto, PublicationUpdateDto } from '../dto/proposal/publication.dto';
import { ProposalPublicationService } from '../services/proposal-publication.service';

@ApiController('proposals', undefined, 'publications')
export class ProposalPublicationController {
  constructor(private readonly proposalPublicationService: ProposalPublicationService) {}

  @Auth(Role.Researcher, Role.RegisteringMember)
  @Post(':id/publications')
  @ProposalValidation()
  @ApiNotFoundResponse({ description: 'Proposal could not be found' })
  @ApiOperation({ summary: 'Creates a publication and adds it to the proposal' })
  async createPublication(
    @Param() { id }: MongoIdParamDto,
    @Body() publicationCreateDto: PublicationCreateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<PublicationGetDto[]> {
    return this.proposalPublicationService.createPublication(id, publicationCreateDto, user);
  }

  @Auth(Role.Researcher, Role.RegisteringMember)
  @Get(':id/publications')
  @ProposalValidation()
  @ApiNotFoundResponse({ description: 'Proposal could not be found' })
  @ApiOperation({ summary: 'Gets all publications for a proposal' })
  async getAllPublications(
    @Param() { id }: MongoIdParamDto,
    @Request() { user }: FdpgRequest,
  ): Promise<PublicationGetDto[]> {
    return this.proposalPublicationService.getAllPublications(id, user);
  }

  @Auth(Role.Researcher, Role.RegisteringMember)
  @Put(':mainId/publications/:subId')
  @ApiNotFoundResponse({ description: 'Item to update could not be found' })
  @ProposalValidation()
  @ApiOperation({ summary: 'Updates a Publication' })
  async updatePublication(
    @Param() { mainId, subId }: MongoTwoIdsParamDto,
    @Body() publicationUpdateDto: PublicationUpdateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<PublicationGetDto[]> {
    return this.proposalPublicationService.updatePublication(mainId, subId, publicationUpdateDto, user);
  }

  @Auth(Role.Researcher, Role.RegisteringMember)
  @Delete(':mainId/publications/:subId')
  @UsePipes(ValidationPipe)
  @ApiNotFoundResponse({ description: 'Publication or proposal could not be found' })
  @ApiNoContentResponse({ description: 'Item successfully deleted. No content returns.' })
  @HttpCode(204)
  @ApiOperation({ summary: 'Deletes a proposal publication' })
  async deletePublication(
    @Param() { mainId, subId }: MongoTwoIdsParamDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    return this.proposalPublicationService.deletePublication(mainId, subId, user);
  }
}
