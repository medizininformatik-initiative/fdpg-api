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
import { MongoIdParamDto, MongoTwoIdsParamDto } from 'src/shared/dto/mongo-id-param.dto';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { CommentService } from './comment.service';
import { CommentValidation } from './decorators/validation.decorator';
import { AnswerCreateDto, AnswerUpdateDto } from './dto/answer.dto';
import { CommentCreateReferenceDto, CommentReferenceDto } from './dto/comment-query.dto';
import { CommentCreateDto, CommentGetDto, CommentUpdateDto } from './dto/comment.dto';
import { MarkAsDoneDto } from './dto/mark-as-done.dto';

@Auth(Role.Researcher, Role.FdpgMember, Role.DizMember, Role.UacMember)
@ApiController('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Returns all comments for an item' })
  findComments(@Request() { user }: FdpgRequest, @Query() query: CommentReferenceDto): Promise<CommentGetDto[]> {
    return this.commentService.findForItem(query, user);
  }

  @Post()
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiOperation({ summary: 'Creates a comment for an item' })
  @CommentValidation()
  create(
    @Request() { user }: FdpgRequest,
    @Query() reference: CommentCreateReferenceDto,
    @Body() createCommentDto: CommentCreateDto,
  ): Promise<CommentGetDto> {
    return this.commentService.create(createCommentDto, reference, user);
  }

  @Put(':id')
  @ApiNotFoundResponse({ description: 'Item to update could not be found' })
  @CommentValidation()
  @ApiOperation({ summary: 'Updates a Comment' })
  async updateComment(
    @Param() { id }: MongoIdParamDto,
    @Body() updateCommentDto: CommentUpdateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<CommentGetDto> {
    return this.commentService.updateComment(id, updateCommentDto, user);
  }

  @Delete(':id')
  @ApiNoContentResponse({ description: 'Item successfully deleted. No content returns.' })
  @HttpCode(204)
  @CommentValidation()
  @ApiOperation({ summary: 'Deletes a Comment' })
  async deleteComment(@Param() { id }: MongoIdParamDto, @Request() { user }: FdpgRequest): Promise<void> {
    return await this.commentService.deleteComment(id, user);
  }

  @Put(':id/isDone')
  @ApiNoContentResponse({ description: 'Item successfully marked as done. No content returns.' })
  @HttpCode(204)
  @CommentValidation()
  @ApiOperation({ summary: 'Updates the isDone field of a Comment' })
  async markCommentAsDone(
    @Param() { id }: MongoIdParamDto,
    @Body() { value }: MarkAsDoneDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    return await this.commentService.markCommentAsDone(id, value, user);
  }

  @Post(':id/answers')
  @ApiNotFoundResponse({ description: 'Item could not be found' })
  @ApiOperation({ summary: 'Creates an answer to a comment' })
  @CommentValidation()
  createAnswer(
    @Request() { user }: FdpgRequest,
    @Param() { id }: MongoIdParamDto,
    @Body() createAnswerDto: AnswerCreateDto,
  ): Promise<CommentGetDto> {
    return this.commentService.createAnswer(createAnswerDto, id, user);
  }

  @Put(':mainId/answers/:subId')
  @ApiNotFoundResponse({ description: 'Item to update could not be found' })
  @CommentValidation()
  @ApiOperation({ summary: 'Updates an Answer' })
  async updateAnswer(
    @Param() { mainId, subId }: MongoTwoIdsParamDto,
    @Body() updateAnswerDto: AnswerUpdateDto,
    @Request() { user }: FdpgRequest,
  ): Promise<CommentGetDto> {
    return this.commentService.updateAnswer(mainId, subId, updateAnswerDto, user);
  }

  @Delete(':mainId/answers/:subId')
  @CommentValidation()
  @ApiOperation({ summary: 'Deletes an Answer' })
  async deleteAnswer(
    @Param() { mainId, subId }: MongoTwoIdsParamDto,
    @Request() { user }: FdpgRequest,
  ): Promise<CommentGetDto> {
    return await this.commentService.deleteAnswer(mainId, subId, user);
  }

  @Auth(Role.FdpgMember)
  @Put(':mainId/answers/:subId/isDone')
  @ApiNoContentResponse({ description: 'Item successfully marked as done. No content returns.' })
  @HttpCode(204)
  @CommentValidation()
  @ApiOperation({ summary: 'Updates the isDone field of an Answer' })
  async markAnswerAsDone(
    @Param() { mainId, subId }: MongoTwoIdsParamDto,
    @Body() { value }: MarkAsDoneDto,
    @Request() { user }: FdpgRequest,
  ): Promise<void> {
    return await this.commentService.markAnswerAsDone(mainId, subId, value, user);
  }
}
