import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToClass } from 'class-transformer';
import { FilterQuery, Model } from 'mongoose';
import { EventEngineService } from 'src/modules/event-engine/event-engine.service';
import { FdpgTaskType } from 'src/modules/proposal/enums/fdpg-task-type.enum';
import { ProposalDocument } from 'src/modules/proposal/schema/proposal.schema';
import { addFdpgTaskAndReturnId, removeFdpgTask } from 'src/modules/proposal/utils/add-fdpg-task.util';
import { MiiLocation } from 'src/shared/constants/mii-locations';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { getError } from 'test/get-error';
import { CommentService } from '../comment.service';
import { filterAllowedAnswers, getAnswer, validateAnswer, getAnswersLocations } from '../comment.utils';
import { AnswerCreateDto } from '../dto/answer.dto';
import { CommentCreateReferenceDto } from '../dto/comment-query.dto';
import { CommentCreateDto, CommentUpdateDto } from '../dto/comment.dto';
import { CommentType } from '../enums/comment-type.enum';
import { ReferenceType } from '../enums/reference-type.enum';
import { Comment, CommentDocument } from '../schema/comment.schema';
import { ProposalCrudService } from 'src/modules/proposal/services/proposal-crud.service';
import { ProposalStatus } from 'src/modules/proposal/enums/proposal-status.enum';

class CommentModel {
  save: jest.Mock;
  constructor(private data) {
    this.save = jest.fn().mockResolvedValue({
      ...this.data,
      toObject: jest.fn().mockImplementation(() => JSON.parse(JSON.stringify(this))),
    });
  }
  static find = jest.fn();
  static findById = jest.fn();
  static findOne = jest.fn();
  static findOneAndUpdate = jest.fn();
  static deleteOne = jest.fn();
}

jest.mock('class-transformer', () => {
  const original = jest.requireActual('class-transformer');
  return {
    ...original,
    plainToClass: jest.fn().mockImplementation((cls, plain, options) => plain),
  };
});

const plainToClassMock = jest.mocked(plainToClass);

jest.mock('src/shared/utils/get-owner.util', () => ({
  getOwner: jest.fn().mockReturnValue('OwnerName'),
}));

jest.mock('../utils/is-done-access.util', () => ({
  validateIsDoneAccess: jest.fn(),
}));

jest.mock('src/modules/proposal/utils/add-fdpg-task.util', () => ({
  addFdpgTaskAndReturnId: jest.fn().mockReturnValue('TaskId'),
  removeFdpgTask: jest.fn(),
}));

jest.mock('../comment.utils', () => ({
  validateAnswer: jest.fn(),
  getAnswersLocations: jest.fn().mockReturnValue([]),
  filterAllowedAnswers: jest.fn().mockReturnValue([]),
  getAnswer: jest.fn(),
}));

describe('CommentService', () => {
  const referenceDocumentId = 'referenceDocumentId';
  const referenceObjectId = 'referenceObjectId';
  const commentId = 'commentId';
  const referenceType = ReferenceType.Proposal;

  let service: CommentService;
  let model: Model<CommentDocument>;

  let proposalCrudService: jest.Mocked<ProposalCrudService>;
  let eventEngineService: jest.Mocked<EventEngineService>;

  let createCommentDto: CommentCreateDto;
  let commentReferenceDto: CommentCreateReferenceDto;
  let answerCreateDto: AnswerCreateDto;

  beforeEach(async () => {
    createCommentDto = new CommentCreateDto();
    commentReferenceDto = new CommentCreateReferenceDto();
    answerCreateDto = new AnswerCreateDto();
    answerCreateDto.content = 'answer';

    commentReferenceDto.referenceDocumentId = referenceDocumentId;
    commentReferenceDto.referenceObjectId = referenceObjectId;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: ProposalCrudService,
          useValue: {
            findDocument: jest.fn(),
          },
        },
        {
          provide: EventEngineService,
          useValue: {
            handleProposalCommentCreation: jest.fn(),
            handleProposalTaskCompletion: jest.fn(),
            handleProposalCommentAnswerCreation: jest.fn(),
          },
        },
        {
          provide: getModelToken('Comment'),
          useValue: CommentModel,
        },
      ],
      imports: [],
    }).compile();

    service = module.get<CommentService>(CommentService);
    proposalCrudService = module.get<ProposalCrudService>(ProposalCrudService) as jest.Mocked<ProposalCrudService>;
    eventEngineService = module.get<EventEngineService>(EventEngineService) as jest.Mocked<EventEngineService>;
    model = module.get<Model<CommentDocument>>(getModelToken('Comment'));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create comments for fdpg users', async () => {
      const proposal = {
        save: jest.fn(),
        version: {
          mayor: 1,
          minor: 0,
        },
      } as unknown as ProposalDocument;

      const user = {
        singleKnownRole: Role.FdpgMember,
      } as unknown as IRequestUser;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);
      commentReferenceDto.referenceType = referenceType;

      const result = (await service.create(createCommentDto, commentReferenceDto, user)) as any;

      expect(result.referenceDocumentId).toEqual(referenceDocumentId);
      expect(result.referenceObjectId).toEqual(referenceObjectId);
      expect(result.referenceType).toEqual(referenceType);
      expect(proposalCrudService.findDocument).toHaveBeenCalledWith(referenceDocumentId, user);
      expect(eventEngineService.handleProposalCommentCreation).toHaveBeenCalledWith(proposal, expect.anything(), user);
    });

    it('should create comments for diz users to fdpg', async () => {
      const proposal = {
        save: jest.fn(),
        version: {
          mayor: 1,
          minor: 0,
        },
      } as unknown as ProposalDocument;

      const user = {
        singleKnownRole: Role.DizMember,
      } as unknown as IRequestUser;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);
      commentReferenceDto.referenceType = referenceType;
      createCommentDto.type = CommentType.ProposalMessageToLocation;

      const result = (await service.create(createCommentDto, commentReferenceDto, user)) as any;

      expect(result.referenceDocumentId).toEqual(referenceDocumentId);
      expect(result.referenceObjectId).toEqual(referenceObjectId);
      expect(result.referenceType).toEqual(referenceType);
      expect(proposalCrudService.findDocument).toHaveBeenCalledWith(referenceDocumentId, user);
      expect(eventEngineService.handleProposalCommentCreation).toHaveBeenCalledWith(proposal, expect.anything(), user);

      expect(result.fdpgTaskId).toEqual('TaskId');
      expect(addFdpgTaskAndReturnId).toHaveBeenCalledWith(proposal, FdpgTaskType.Comment);
      expect(proposal.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('createAnswer', () => {
    it('should throw if the comment is not found', async () => {
      const user = {
        singleKnownRole: Role.DizMember,
      } as unknown as IRequestUser;
      CommentModel.findById.mockResolvedValueOnce(undefined);

      const call = service.createAnswer(answerCreateDto, commentId, user);

      const error = await getError(async () => await call);

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(NotFoundException);
    });

    it('create the answer', async () => {
      const user = {
        singleKnownRole: Role.DizMember,
      } as unknown as IRequestUser;

      const mainComment = {
        save: jest.fn().mockImplementation(function () {
          return {
            ...this,
            toObject: jest.fn().mockReturnValue(this),
          };
        }),

        referenceType: ReferenceType.Proposal,
        owner: {
          role: Role.FdpgMember,
        },
        answers: [],
        content: 'comment',
      };

      const proposal = {
        save: jest.fn(),
        version: {
          mayor: 1,
          minor: 0,
        },
      } as unknown as ProposalDocument;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);
      CommentModel.findById.mockResolvedValueOnce(mainComment);
      const result = await service.createAnswer(answerCreateDto, commentId, user);
      expect(validateAnswer).toHaveBeenCalledWith(mainComment, user);
      expect(addFdpgTaskAndReturnId).toHaveBeenCalledWith(proposal, FdpgTaskType.Comment);
      expect(proposal.save).toHaveBeenCalledTimes(1);
      expect(filterAllowedAnswers).toHaveBeenCalledWith(user, expect.anything());
      expect(result.answers.length).toBe(0);
      expect(eventEngineService.handleProposalCommentAnswerCreation).toHaveBeenCalledWith(
        proposal,
        expect.objectContaining({ content: 'comment' }),
        expect.objectContaining({ content: 'answer' }),
        user,
      );
    });
  });

  describe('findForItem', () => {
    test.each([Role.Researcher, Role.DizMember])('', async (role) => {
      const mainComment = {
        toObject: jest.fn().mockReturnValue({ answers: ['toObjectResult'] }),

        referenceType: ReferenceType.Proposal,
        owner: {
          miiLocation: MiiLocation.UMG,
          role,
        },
        answers: [],
      };

      const user = {
        singleKnownRole: role,
        miiLocation: role === Role.Researcher ? undefined : MiiLocation.KUM,
        isFromLocation: role === Role.Researcher ? false : true,
      } as unknown as IRequestUser;

      const proposal = {
        status: ProposalStatus.Rework,
      } as unknown as ProposalDocument;

      CommentModel.find.mockResolvedValue([mainComment]);

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      const result = await service.findForItem(commentReferenceDto, user);
      let filter: FilterQuery<Comment> = {
        ...commentReferenceDto,
      };

      if (role === Role.Researcher && proposal.status === ProposalStatus.Rework) {
        filter.type = { $in: [CommentType.ProposalMessageToOwner, CommentType.ProposalTask] };
      } else if (role === Role.Researcher) {
        filter.type = { $in: [CommentType.ProposalMessageToOwner] };
      } else {
        filter.type = { $in: [CommentType.ProposalMessageToLocation, CommentType.ProposalTaskFdpg] };
        filter.locations = { $in: [user.miiLocation, MiiLocation.VirtualAll] };
      }

      expect(CommentModel.find).toHaveBeenCalledWith(filter);
      expect(filterAllowedAnswers).toHaveBeenCalledWith(user, expect.anything());
      expect(result).toEqual([{ answers: [] }]);
    });
  });

  describe('updateComment', () => {
    it('should update the comment for fdpg member with location change', async () => {
      const user = {
        singleKnownRole: Role.FdpgMember,
        userId: 'ownerId',
      } as unknown as IRequestUser;
      const newContent = 'new Content';
      const newLocations = [MiiLocation.UKL];
      const mainComment = {
        save: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue('toObjectResult'),
        }),

        referenceType: ReferenceType.Proposal,
        owner: {
          id: 'ownerId',
          role: Role.FdpgMember,
        },
        locations: [MiiLocation.UMG],
        content: 'oldContent',
      };

      const commentId = 'commentId';
      const updateCommentDto = {
        content: newContent,
        locations: newLocations,
      } as unknown as CommentUpdateDto;

      CommentModel.findById.mockResolvedValueOnce(mainComment);

      const result = await service.updateComment(commentId, updateCommentDto, user);

      expect(CommentModel.findById).toHaveBeenCalledWith(commentId);
      expect(filterAllowedAnswers).toHaveBeenCalledWith(user, expect.anything());
      expect(mainComment.locations).toEqual(newLocations);
      expect(mainComment.content).toEqual(newContent);
      expect(mainComment.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual('toObjectResult');
    });

    it('should update the comment for diz member without location change', async () => {
      const user = {
        singleKnownRole: Role.DizMember,
        userId: 'ownerId',
      } as unknown as IRequestUser;
      const newContent = 'new Content';
      const newLocations = [MiiLocation.UKL];
      const oldLocations = [MiiLocation.UMG];

      const mainComment = {
        save: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue('toObjectResult'),
        }),

        referenceType: ReferenceType.Proposal,
        owner: {
          id: 'ownerId',
          role: Role.FdpgMember,
        },
        locations: oldLocations,
        content: 'oldContent',
      };

      const commentId = 'commentId';
      const updateCommentDto = {
        content: newContent,
        locations: newLocations,
      } as unknown as CommentUpdateDto;

      CommentModel.findById.mockResolvedValueOnce(mainComment);

      const result = await service.updateComment(commentId, updateCommentDto, user);

      expect(CommentModel.findById).toHaveBeenCalledWith(commentId);
      expect(filterAllowedAnswers).toHaveBeenCalledWith(user, expect.anything());
      expect(mainComment.locations).toEqual(oldLocations);
      expect(mainComment.content).toEqual(newContent);
      expect(mainComment.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual('toObjectResult');
    });

    it('should throw for updates from different owner', async () => {
      const user = {
        singleKnownRole: Role.DizMember,
        userId: 'someOtherUserId',
      } as unknown as IRequestUser;
      const newContent = 'new Content';
      const newLocations = [MiiLocation.UKL];
      const oldLocations = [MiiLocation.UMG];

      const mainComment = {
        save: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue('toObjectResult'),
        }),

        referenceType: ReferenceType.Proposal,
        owner: {
          id: 'ownerId',
          role: Role.FdpgMember,
        },
        locations: oldLocations,
        content: 'oldContent',
      };

      const commentId = 'commentId';
      const updateCommentDto = {
        content: newContent,
        locations: newLocations,
      } as unknown as CommentUpdateDto;

      CommentModel.findById.mockResolvedValueOnce(mainComment);

      const call = service.updateComment(commentId, updateCommentDto, user);
      const error = await getError(async () => await call);

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenException);
    });

    it('should not throw for updates from different owner but both Fdpg member', async () => {
      const user = {
        singleKnownRole: Role.FdpgMember,
        userId: 'someOtherUserId',
      } as unknown as IRequestUser;
      const newContent = 'new Content';
      const newLocations = [MiiLocation.UKL];
      const oldLocations = [MiiLocation.UMG];

      const mainComment = {
        save: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue('toObjectResult'),
        }),

        referenceType: ReferenceType.Proposal,
        owner: {
          id: 'ownerId',
          role: Role.FdpgMember,
        },
        locations: oldLocations,
        content: 'oldContent',
      };

      const commentId = 'commentId';
      const updateCommentDto = {
        content: newContent,
        locations: newLocations,
      } as unknown as CommentUpdateDto;

      CommentModel.findById.mockResolvedValueOnce(mainComment);

      const result = await service.updateComment(commentId, updateCommentDto, user);
      expect(mainComment.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual('toObjectResult');
    });
  });

  describe('updateAnswer', () => {
    it('should update the answer for diz member', async () => {
      const commentId = 'commentId';
      const answerId = 'answerId';
      const newContent = 'new Content';
      const oldContent = 'old Content';
      const newLocations = [MiiLocation.UKL];
      const oldLocations = [MiiLocation.UMG];

      const mainComment = {
        save: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue('toObjectResult'),
        }),

        referenceType: ReferenceType.Proposal,
        owner: {
          id: 'ownerId',
          role: Role.FdpgMember,
        },
        locations: oldLocations,
        content: 'oldContent',
      };

      const user = {
        singleKnownRole: Role.DizMember,
        userId: 'ownerId',
      } as unknown as IRequestUser;

      const updateAnswerDto = {
        content: newContent,
        locations: newLocations,
      };

      const answer = {
        content: oldContent,
        locations: oldLocations,
        owner: {
          id: 'ownerId',
        },
      };

      CommentModel.findById.mockResolvedValueOnce(mainComment);
      (getAnswer as any).mockReturnValue({ answer });
      (getAnswersLocations as any).mockReturnValue([MiiLocation.KUM]);

      const result = await service.updateAnswer(commentId, answerId, updateAnswerDto, user);

      expect(filterAllowedAnswers).toHaveBeenCalledWith(user, expect.anything());
      expect(result).toEqual('toObjectResult');
      expect(answer.locations).toEqual(oldLocations);
      expect(answer.locations).not.toEqual(newLocations);
      expect(answer.content).toEqual(newContent);
    });

    it('should update the answer for fdpg member', async () => {
      const commentId = 'commentId';
      const answerId = 'answerId';
      const newContent = 'new Content';
      const oldContent = 'old Content';
      const newLocations = [MiiLocation.UKL];
      const oldLocations = [MiiLocation.UMG];

      const mainComment = {
        save: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue('toObjectResult'),
        }),

        referenceType: ReferenceType.Proposal,
        owner: {
          id: 'ownerId',
          role: Role.FdpgMember,
        },
        locations: oldLocations,
        content: 'oldContent',
      };

      const user = {
        singleKnownRole: Role.FdpgMember,
        userId: 'ownerId',
      } as unknown as IRequestUser;

      const updateAnswerDto = {
        content: newContent,
        locations: newLocations,
      };

      const answer = {
        content: oldContent,
        locations: oldLocations,
        owner: {
          id: 'ownerId',
        },
      };

      CommentModel.findById.mockResolvedValueOnce(mainComment);
      (getAnswer as any).mockReturnValue({ answer });
      (getAnswersLocations as any).mockReturnValue([MiiLocation.KUM]);

      const result = await service.updateAnswer(commentId, answerId, updateAnswerDto, user);

      expect(filterAllowedAnswers).toHaveBeenCalledWith(user, expect.anything());
      expect(result).toEqual('toObjectResult');
      expect(answer.locations).not.toEqual(oldLocations);
      expect(answer.locations).toEqual(newLocations);
      expect(answer.content).toEqual(newContent);
    });

    it('should update the answer for different fdpg member', async () => {
      const commentId = 'commentId';
      const answerId = 'answerId';
      const newContent = 'new Content';
      const oldContent = 'old Content';
      const newLocations = [MiiLocation.UKL];
      const oldLocations = [MiiLocation.UMG];

      const mainComment = {
        save: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue('toObjectResult'),
        }),

        referenceType: ReferenceType.Proposal,
        owner: {
          id: 'ownerId',
          role: Role.FdpgMember,
        },
        locations: oldLocations,
        content: 'oldContent',
      };

      const user = {
        singleKnownRole: Role.FdpgMember,
        userId: 'otherOwnerId',
      } as unknown as IRequestUser;

      const updateAnswerDto = {
        content: newContent,
        locations: newLocations,
      };

      const answer = {
        content: oldContent,
        locations: oldLocations,
        owner: {
          id: 'ownerId',
          role: Role.FdpgMember,
        },
      };

      CommentModel.findById.mockResolvedValueOnce(mainComment);
      (getAnswer as any).mockReturnValue({ answer });
      (getAnswersLocations as any).mockReturnValue([MiiLocation.KUM]);

      const result = await service.updateAnswer(commentId, answerId, updateAnswerDto, user);

      expect(filterAllowedAnswers).toHaveBeenCalledWith(user, expect.anything());
      expect(result).toEqual('toObjectResult');
      expect(answer.locations).not.toEqual(oldLocations);
      expect(answer.locations).toEqual(newLocations);
      expect(answer.content).toEqual(newContent);
    });

    it('should throw on updating an answer from another user if they are not both fdpg member', async () => {
      const commentId = 'commentId';
      const answerId = 'answerId';
      const newContent = 'new Content';
      const oldContent = 'old Content';
      const newLocations = [MiiLocation.UKL];
      const oldLocations = [MiiLocation.UMG];

      const mainComment = {
        save: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue('toObjectResult'),
        }),

        referenceType: ReferenceType.Proposal,
        owner: {
          id: 'ownerId',
          role: Role.FdpgMember,
        },
        locations: oldLocations,
        content: 'oldContent',
      };

      const user = {
        singleKnownRole: Role.DizMember,
        userId: 'anotherUserId',
      } as unknown as IRequestUser;

      const updateAnswerDto = {
        content: newContent,
        locations: newLocations,
      };

      const answer = {
        content: oldContent,
        locations: oldLocations,
        owner: {
          id: 'ownerId',
        },
      };

      CommentModel.findById.mockResolvedValueOnce(mainComment);
      (getAnswer as any).mockReturnValue({ answer });

      const call = service.updateAnswer(commentId, answerId, updateAnswerDto, user);
      const error = await getError(async () => await call);
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenException);
    });
  });

  describe('deleteComment', () => {
    it('fdpg member can delete any comment', async () => {
      const mainComment = {
        deleteOne: jest.fn(),
        referenceType: ReferenceType.Proposal,
        fdpgTaskId: 'mainCommentTaskId',
        owner: {
          id: 'ownerId',
          role: Role.FdpgMember,
        },
        answers: [{ fdpgTaskId: 'answerTaskId' }],
      };
      const proposal = {
        save: jest.fn(),
        version: {
          mayor: 1,
          minor: 0,
        },
        openFdpgTasks: ['mainCommentTaskId', 'answerTaskId'],
        openFdpgTasksCount: 2,
      } as unknown as ProposalDocument;

      const user = {
        singleKnownRole: Role.FdpgMember,
        userId: 'someUserId',
      } as unknown as IRequestUser;

      CommentModel.findById.mockResolvedValueOnce(mainComment);
      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);
      await service.deleteComment('commentId', user);
      expect(removeFdpgTask).toHaveBeenCalledWith(proposal, 'mainCommentTaskId');
      expect(removeFdpgTask).toHaveBeenCalledWith(proposal, 'answerTaskId');
      expect(mainComment.deleteOne).toHaveBeenCalledTimes(1);
    });

    it('diz member can delete own comment', async () => {
      const mainComment = {
        deleteOne: jest.fn(),
        referenceType: ReferenceType.Proposal,
        fdpgTaskId: 'mainCommentTaskId',
        owner: {
          id: 'ownerId',
          role: Role.DizMember,
        },
        answers: [{ fdpgTaskId: 'answerTaskId' }],
      };
      const proposal = {
        save: jest.fn(),
        version: {
          mayor: 1,
          minor: 0,
        },
        openFdpgTasks: ['mainCommentTaskId', 'answerTaskId'],
        openFdpgTasksCount: 2,
      } as unknown as ProposalDocument;

      const user = {
        singleKnownRole: Role.DizMember,
        userId: 'ownerId',
      } as unknown as IRequestUser;

      CommentModel.findById.mockResolvedValueOnce(mainComment);
      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);
      await service.deleteComment('commentId', user);
      expect(removeFdpgTask).toHaveBeenCalledWith(proposal, 'mainCommentTaskId');
      expect(removeFdpgTask).toHaveBeenCalledWith(proposal, 'answerTaskId');
      expect(mainComment.deleteOne).toHaveBeenCalledTimes(1);
    });

    it('diz member can not delete others comment', async () => {
      const mainComment = {
        deleteOne: jest.fn(),
        referenceType: ReferenceType.Proposal,
        fdpgTaskId: 'mainCommentTaskId',
        owner: {
          id: 'ownerId',
          role: Role.Researcher,
        },
        answers: [{ fdpgTaskId: 'answerTaskId' }],
      };
      const proposal = {
        save: jest.fn(),
        version: {
          mayor: 1,
          minor: 0,
        },
        openFdpgTasks: ['mainCommentTaskId', 'answerTaskId'],
        openFdpgTasksCount: 2,
      } as unknown as ProposalDocument;

      const user = {
        singleKnownRole: Role.DizMember,
        userId: 'someother',
      } as unknown as IRequestUser;

      CommentModel.findById.mockResolvedValueOnce(mainComment);
      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);
      const call = service.deleteComment('commentId', user);
      const error = await getError(async () => await call);

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenException);
    });
  });

  describe('markCommentAsDone', () => {
    it('should mark the comment as done', async () => {
      const user = {
        singleKnownRole: Role.FdpgMember,
      } as unknown as IRequestUser;

      const mainComment = {
        save: jest.fn().mockResolvedValue('saveResult'),
        referenceType: ReferenceType.Proposal,
        type: CommentType.ProposalTask,
        fdpgTaskId: 'mainCommentTaskId',
        isDone: false,
        owner: {
          id: 'ownerId',
          role: Role.Researcher,
        },
        answers: [{ fdpgTaskId: 'answerTaskId' }],
      };

      const proposal = {
        save: jest.fn(),
      } as unknown as ProposalDocument;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);
      CommentModel.findById.mockResolvedValueOnce(mainComment);

      await service.markCommentAsDone('commentId', true, user);

      expect(removeFdpgTask).toHaveBeenCalledWith(proposal, 'mainCommentTaskId');
      expect(eventEngineService.handleProposalTaskCompletion).toHaveBeenCalledWith(proposal, 'saveResult', user);
      expect(mainComment.isDone).toBeTruthy();
    });

    it('should mark the comment as undone', async () => {
      const user = {
        singleKnownRole: Role.FdpgMember,
      } as unknown as IRequestUser;

      const mainComment = {
        save: jest.fn().mockResolvedValue('saveResult'),
        referenceType: ReferenceType.Proposal,
        type: CommentType.ProposalTask,
        fdpgTaskId: 'mainCommentTaskId',
        isDone: true,
        owner: {
          id: 'ownerId',
          role: Role.Researcher,
        },
        answers: [{ fdpgTaskId: 'answerTaskId' }],
      };

      const proposal = {
        save: jest.fn(),
      } as unknown as ProposalDocument;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);
      CommentModel.findById.mockResolvedValueOnce(mainComment);

      await service.markCommentAsDone('commentId', false, user);

      expect(addFdpgTaskAndReturnId).toHaveBeenCalledWith(proposal, FdpgTaskType.Comment);
      expect(eventEngineService.handleProposalTaskCompletion).toHaveBeenCalledWith(proposal, 'saveResult', user);
      expect(mainComment.isDone).toBeFalsy();
    });
  });

  describe('deleteAnswer', () => {
    it('fdpg member should be able to delete answers', async () => {
      const commentId = 'commentId';
      const answerId = 'answerId';
      const newLocations = [MiiLocation.UKL];
      const oldLocations = [MiiLocation.UMG];

      const answer = {
        locations: oldLocations,
        fdpgTaskId: 'answerTaskId',
        owner: {
          role: Role.FdpgMember,
          id: 'ownerId',
        },
      };

      const mainComment = {
        save: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue('toObjectResult'),
        }),
        referenceType: ReferenceType.Proposal,
        locations: oldLocations,
        answers: [answer],
      };

      const user = {
        singleKnownRole: Role.FdpgMember,
        userId: 'someUserId',
      } as unknown as IRequestUser;

      const answerIndex = 0;

      const proposal = {
        save: jest.fn(),
      } as unknown as ProposalDocument;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      CommentModel.findById.mockResolvedValueOnce(mainComment);
      (getAnswer as any).mockReturnValue({ answer, answerIndex });
      (getAnswersLocations as any).mockReturnValue([MiiLocation.KUM]);

      const result = await service.deleteAnswer(commentId, answerId, user);

      expect(filterAllowedAnswers).toHaveBeenCalledWith(user, expect.anything());
      expect(result).toEqual('toObjectResult');
      expect(mainComment.answers.length).toEqual(0);
      expect(removeFdpgTask).toHaveBeenCalledWith(proposal, 'answerTaskId');
    });

    it('answer owner should be able to delete answers', async () => {
      const commentId = 'commentId';
      const answerId = 'answerId';
      const newLocations = [MiiLocation.UKL];
      const oldLocations = [MiiLocation.UMG];

      const answer = {
        locations: oldLocations,
        fdpgTaskId: 'answerTaskId',
        owner: {
          role: Role.DizMember,
          id: 'ownerId',
        },
      };

      const mainComment = {
        save: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue('toObjectResult'),
        }),
        referenceType: ReferenceType.Proposal,
        locations: oldLocations,
        answers: [answer],
      };

      const user = {
        singleKnownRole: Role.FdpgMember,
        userId: 'ownerId',
      } as unknown as IRequestUser;

      const answerIndex = 0;

      const proposal = {
        save: jest.fn(),
      } as unknown as ProposalDocument;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      CommentModel.findById.mockResolvedValueOnce(mainComment);
      (getAnswer as any).mockReturnValue({ answer, answerIndex });
      (getAnswersLocations as any).mockReturnValue([MiiLocation.KUM]);

      const result = await service.deleteAnswer(commentId, answerId, user);

      expect(filterAllowedAnswers).toHaveBeenCalledWith(user, expect.anything());
      expect(result).toEqual('toObjectResult');
      expect(mainComment.answers.length).toEqual(0);
      expect(removeFdpgTask).toHaveBeenCalledWith(proposal, 'answerTaskId');
    });

    it('should throw for deleting others answers', async () => {
      const commentId = 'commentId';
      const answerId = 'answerId';
      const oldLocations = [MiiLocation.UMG];

      const answer = {
        locations: oldLocations,
        fdpgTaskId: 'answerTaskId',
        owner: {
          role: Role.DizMember,
          id: 'ownerId',
        },
      };

      const mainComment = {
        save: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue('toObjectResult'),
        }),
        referenceType: ReferenceType.Proposal,
        locations: oldLocations,
        answers: [answer],
      };

      const user = {
        singleKnownRole: Role.DizMember,
        userId: 'someOther',
      } as unknown as IRequestUser;

      const answerIndex = 0;

      const proposal = {
        save: jest.fn(),
      } as unknown as ProposalDocument;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      CommentModel.findById.mockResolvedValueOnce(mainComment);
      (getAnswer as any).mockReturnValue({ answer, answerIndex });

      const call = service.deleteAnswer(commentId, answerId, user);

      const error = await getError(async () => await call);

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ForbiddenException);
    });
  });

  describe('markAnswerAsDone', () => {
    it('should mark an answer as done', async () => {
      const commentId = 'commentId';
      const answerId = 'answerId';

      const answer = {
        fdpgTaskId: 'answerTaskId',
        isDone: false,
        owner: {
          role: Role.FdpgMember,
          id: 'ownerId',
        },
      };

      const mainComment = {
        save: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue('toObjectResult'),
        }),
        referenceType: ReferenceType.Proposal,
      };

      const user = {
        singleKnownRole: Role.FdpgMember,
        userId: 'someOther',
      } as unknown as IRequestUser;

      const proposal = {
        save: jest.fn(),
      } as unknown as ProposalDocument;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      CommentModel.findById.mockResolvedValueOnce(mainComment);
      (getAnswer as any).mockReturnValue({ answer });

      await service.markAnswerAsDone(commentId, answerId, true, user);

      expect(removeFdpgTask).toHaveBeenCalledWith(proposal, 'answerTaskId');
      expect(answer.isDone).toBeTruthy();
    });

    it('should mark an answer as undone', async () => {
      const commentId = 'commentId';
      const answerId = 'answerId';

      const answer = {
        fdpgTaskId: 'answerTaskId',
        isDone: true,
        owner: {
          role: Role.FdpgMember,
          id: 'ownerId',
        },
      };

      const mainComment = {
        save: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue('toObjectResult'),
        }),
        fdpgTaskId: 'mainCommentTaskId',
        referenceType: ReferenceType.Proposal,
      };

      const user = {
        singleKnownRole: Role.FdpgMember,
        userId: 'someOther',
      } as unknown as IRequestUser;

      const proposal = {
        save: jest.fn(),
      } as unknown as ProposalDocument;

      proposalCrudService.findDocument.mockResolvedValueOnce(proposal);

      CommentModel.findById.mockResolvedValueOnce(mainComment);
      (getAnswer as any).mockReturnValue({ answer });

      await service.markAnswerAsDone(commentId, answerId, false, user);

      expect(addFdpgTaskAndReturnId).toHaveBeenCalledWith(proposal, FdpgTaskType.Comment);
      expect(answer.isDone).toBeFalsy();
    });
  });
});
