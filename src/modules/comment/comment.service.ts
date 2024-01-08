import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToClass } from 'class-transformer';
import { FilterQuery, Model } from 'mongoose';
import { Comment, CommentDocument } from 'src/modules/comment/schema/comment.schema';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { getOwner } from 'src/shared/utils/get-owner.util';
import { EventEngineService } from '../event-engine/event-engine.service';
import { FdpgTaskType } from '../proposal/enums/fdpg-task-type.enum';
import { ProposalDocument } from '../proposal/schema/proposal.schema';
import { addFdpgTaskAndReturnId, removeFdpgTask } from '../proposal/utils/add-fdpg-task.util';
import { filterAllowedAnswers, getAnswer, getAnswersLocations, validateAnswer } from './comment.utils';
import { AnswerCreateDto, AnswerGetDto, AnswerUpdateDto } from './dto/answer.dto';
import { CommentCreateReferenceDto, CommentReferenceDto } from './dto/comment-query.dto';
import { CommentCreateDto, CommentGetDto, CommentUpdateDto } from './dto/comment.dto';
import { CommentType } from './enums/comment-type.enum';
import { ReferenceType } from './enums/reference-type.enum';
import { ValidationGroup } from './enums/validation-group.enum';
import { Answer } from './schema/answer.schema';
import { validateIsDoneAccess } from './utils/is-done-access.util';
import { ProposalCrudService } from '../proposal/services/proposal-crud.service';
import { ProposalStatus } from '../proposal/enums/proposal-status.enum';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name)
    private commentModel: Model<CommentDocument>,
    private proposalCrudService: ProposalCrudService,
    private eventEngineService: EventEngineService,
  ) {}

  async create(
    createCommentDto: CommentCreateDto,
    reference: CommentCreateReferenceDto,
    user: IRequestUser,
  ): Promise<CommentGetDto> {
    const isFdpgMember = user.singleKnownRole === Role.FdpgMember;
    const isMessage =
      createCommentDto.type === CommentType.ProposalMessageToOwner ||
      createCommentDto.type === CommentType.ProposalMessageToLocation;

    const isTaskOrMessageForFdpg =
      (isMessage && !isFdpgMember) || createCommentDto.type === CommentType.ProposalTaskFdpg;

    const model = new this.commentModel(createCommentDto);
    model.referenceType = reference.referenceType;

    let proposal: ProposalDocument;

    if (reference.referenceType === ReferenceType.Proposal || reference.referenceType === undefined) {
      proposal = await this.proposalCrudService.findDocument(reference.referenceDocumentId, user);
      model.versionOfItem = proposal.version;

      if (isTaskOrMessageForFdpg) {
        const fdpgTaskId = addFdpgTaskAndReturnId(proposal, FdpgTaskType.Comment);
        model.fdpgTaskId = fdpgTaskId;
        await proposal.save();
      }
    }

    model.owner = getOwner(user);

    if (!isFdpgMember) {
      model.locations = user.miiLocation ? [user.miiLocation] : [];
    }

    model.referenceDocumentId = reference.referenceDocumentId;
    model.referenceObjectId = reference.referenceObjectId;

    const saveResult = await model.save();
    const plain = saveResult.toObject();

    await this.eventEngineService.handleProposalCommentCreation(proposal, saveResult, user);

    return plainToClass(CommentGetDto, plain, { groups: [user.singleKnownRole, ValidationGroup.IsOwnLocation] });
  }

  private async findDocument(id: string): Promise<CommentDocument> {
    const document = await this.commentModel.findById(id);
    if (document) {
      return document;
    } else {
      throw new NotFoundException();
    }
  }

  async createAnswer(createAnswerDto: AnswerCreateDto, commentId: string, user: IRequestUser): Promise<CommentGetDto> {
    const mainComment = await this.findDocument(commentId);
    validateAnswer(mainComment, user);

    const answerModel = plainToClass(Answer, createAnswerDto);

    answerModel.owner = getOwner(user);

    // Only FDPG Members should set locations
    if (user.singleKnownRole !== Role.FdpgMember) {
      answerModel.locations = user.miiLocation ? [user.miiLocation] : [];
    }

    let proposal: ProposalDocument;
    if (mainComment.referenceType === ReferenceType.Proposal) {
      proposal = await this.proposalCrudService.findDocument(mainComment.referenceDocumentId, user);
      answerModel.versionOfItem = proposal.version;

      if (mainComment.owner.role === Role.FdpgMember) {
        answerModel.fdpgTaskId = addFdpgTaskAndReturnId(proposal, FdpgTaskType.Comment);
        await proposal.save();
      }
    }

    mainComment.answers.push(answerModel);

    // FDPG Members could change visibility of initial question by answering
    if (user.singleKnownRole === Role.FdpgMember) {
      mainComment.locations = getAnswersLocations(mainComment);
    }

    const saveResult = await mainComment.save();

    await this.eventEngineService.handleProposalCommentAnswerCreation(proposal, saveResult, answerModel, user);

    saveResult.answers = filterAllowedAnswers(user, saveResult);
    const finalAnswers = saveResult.answers.map((answer) => {
      const answerGroups: string[] = [user.singleKnownRole];
      if (answer.owner.id === user.userId) {
        answerGroups.push(ValidationGroup.IsOwnLocation);
      }
      return plainToClass(AnswerGetDto, JSON.parse(JSON.stringify(answer)), {
        groups: answerGroups,
      });
    });
    saveResult.answers = [];
    const plain = saveResult.toObject();
    const finalComment = plainToClass(CommentGetDto, plain, { groups: [user.singleKnownRole] });
    finalComment.answers = finalAnswers;
    return finalComment;
  }

  async findForItem(commentReference: CommentReferenceDto, user: IRequestUser): Promise<CommentGetDto[]> {
    const filter: FilterQuery<Comment> = {
      ...commentReference,
    };
    const projection = { status: 1 };
    const proposal = await this.proposalCrudService.findDocument(
      commentReference.referenceDocumentId,
      user,
      projection,
      false,
    );

    if (user.singleKnownRole === Role.Researcher && proposal.status === ProposalStatus.Rework) {
      filter.type = { $in: [CommentType.ProposalMessageToOwner, CommentType.ProposalTask] };
    } else if (user.singleKnownRole === Role.Researcher) {
      filter.type = { $in: [CommentType.ProposalMessageToOwner] };
    } else if (user.isFromLocation) {
      filter.type = { $in: [CommentType.ProposalMessageToLocation, CommentType.ProposalTaskFdpg] };
      filter.locations = { $in: [user.miiLocation, MiiLocation.VirtualAll] };
    }

    const comments = await this.commentModel.find(filter);

    return comments.map((comment) => {
      const groups: string[] = [user.singleKnownRole];
      if (comment.owner.miiLocation === user.miiLocation) {
        groups.push(ValidationGroup.IsOwnLocation);
      }

      comment.answers = filterAllowedAnswers(user, comment);
      const finalAnswers = comment.answers.map((answer) => {
        const answerGroups: string[] = [user.singleKnownRole];
        if (answer.owner.id === user.userId) {
          answerGroups.push(ValidationGroup.IsOwnLocation);
        }
        return plainToClass(AnswerGetDto, JSON.parse(JSON.stringify(answer)), {
          groups: answerGroups,
        });
      });
      comment.answers = [];
      const plain = comment.toObject();
      const finalComment = plainToClass(CommentGetDto, plain, {
        groups,
      });
      finalComment.answers = finalAnswers;
      return finalComment;
    });
  }

  async updateComment(
    commentId: string,
    updateCommentDto: CommentUpdateDto,
    user: IRequestUser,
  ): Promise<CommentGetDto> {
    const mainComment = await this.findDocument(commentId);

    if (
      !(mainComment.owner.role === Role.FdpgMember && user.singleKnownRole === Role.FdpgMember) &&
      mainComment.owner.id !== user.userId
    ) {
      throw new ForbiddenException();
    }

    mainComment.content = updateCommentDto.content;

    if (user.singleKnownRole === Role.FdpgMember) {
      mainComment.locations = updateCommentDto.locations;
    }

    const saveResult = await mainComment.save();
    saveResult.answers = filterAllowedAnswers(user, saveResult);
    const plain = saveResult.toObject();

    return plainToClass(CommentGetDto, plain, { groups: [user.singleKnownRole, ValidationGroup.IsOwnLocation] });
  }

  async updateAnswer(
    commentId: string,
    answerId: string,
    updateAnswerDto: AnswerUpdateDto,
    user: IRequestUser,
  ): Promise<CommentGetDto> {
    const mainComment = await this.findDocument(commentId);
    const { answer } = getAnswer(mainComment, answerId);

    if (
      !(answer.owner.role === Role.FdpgMember && user.singleKnownRole === Role.FdpgMember) &&
      answer.owner.id !== user.userId
    ) {
      throw new ForbiddenException();
    }

    answer.content = updateAnswerDto.content;

    if (user.singleKnownRole === Role.FdpgMember) {
      answer.locations = updateAnswerDto.locations;
      mainComment.locations = getAnswersLocations(mainComment);
    }

    const saveResult = await mainComment.save();
    saveResult.answers = filterAllowedAnswers(user, saveResult);
    const plain = saveResult.toObject();

    return plainToClass(CommentGetDto, plain, { groups: [user.singleKnownRole, ValidationGroup.IsOwnLocation] });
  }

  async deleteComment(commentId: string, user: IRequestUser): Promise<void> {
    const mainComment = await this.findDocument(commentId);

    if (mainComment.owner.id === user.userId || user.singleKnownRole === Role.FdpgMember) {
      if (mainComment.referenceType === ReferenceType.Proposal) {
        const proposal = await this.proposalCrudService.findDocument(mainComment.referenceDocumentId, user);
        const fdpgTaskIds = [
          ...mainComment.answers.map((answer) => answer.fdpgTaskId).filter((fdpgTaskId) => fdpgTaskId !== undefined),
          mainComment.fdpgTaskId,
        ];
        fdpgTaskIds.forEach((fdpgTaskId) => removeFdpgTask(proposal, fdpgTaskId));
        await proposal.save();
      }
      await mainComment.deleteOne();
    } else {
      throw new ForbiddenException();
    }
  }

  async markCommentAsDone(commentId: string, isDone: boolean, user: IRequestUser): Promise<void> {
    const mainComment = await this.findDocument(commentId);

    validateIsDoneAccess(mainComment.type, user.singleKnownRole);

    let proposal: ProposalDocument;
    if (mainComment.referenceType === ReferenceType.Proposal) {
      proposal = await this.proposalCrudService.findDocument(mainComment.referenceDocumentId, user);

      if (isDone) {
        removeFdpgTask(proposal, mainComment.fdpgTaskId);
        await proposal.save();
      } else if (!isDone && mainComment.fdpgTaskId) {
        mainComment.fdpgTaskId = addFdpgTaskAndReturnId(proposal, FdpgTaskType.Comment);
      }
    }

    mainComment.isDone = isDone;

    const saveResult = await mainComment.save();

    if (mainComment.type === CommentType.ProposalTask || mainComment.type === CommentType.ProposalTaskFdpg) {
      await this.eventEngineService.handleProposalTaskCompletion(proposal, saveResult, user);
    }
  }

  async deleteAnswer(commentId: string, answerId: string, user: IRequestUser): Promise<CommentGetDto> {
    const mainComment = await this.findDocument(commentId);
    const { answer, answerIndex } = getAnswer(mainComment, answerId);
    const isFdpgAnswer = answer.owner.role === Role.FdpgMember;

    if (answer.owner.id !== user.userId && user.singleKnownRole !== Role.FdpgMember) {
      throw new ForbiddenException();
    }

    mainComment.answers.splice(answerIndex, 1);

    if (isFdpgAnswer) {
      mainComment.locations = getAnswersLocations(mainComment);
    }

    if (mainComment.referenceType === ReferenceType.Proposal) {
      const proposal = await this.proposalCrudService.findDocument(mainComment.referenceDocumentId, user);
      removeFdpgTask(proposal, answer.fdpgTaskId);
      await proposal.save();
    }

    const saveResult = await mainComment.save();
    saveResult.answers = filterAllowedAnswers(user, saveResult);
    const plain = saveResult.toObject();

    return plainToClass(CommentGetDto, plain, { groups: [user.singleKnownRole] });
  }

  async markAnswerAsDone(commentId: string, answerId: string, isDone: boolean, user: IRequestUser): Promise<void> {
    const mainComment = await this.findDocument(commentId);
    const { answer } = getAnswer(mainComment, answerId);

    if (mainComment.referenceType === ReferenceType.Proposal) {
      const proposal = await this.proposalCrudService.findDocument(mainComment.referenceDocumentId, user);

      if (isDone) {
        removeFdpgTask(proposal, answer.fdpgTaskId);
        await proposal.save();
      } else if (!isDone && mainComment.fdpgTaskId) {
        answer.fdpgTaskId = addFdpgTaskAndReturnId(proposal, FdpgTaskType.Comment);
      }
    }

    answer.isDone = isDone;
    await mainComment.save();
  }
}
