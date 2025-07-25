import { Test } from '@nestjs/testing';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { CommentController } from '../comment.controller';
import { CommentService } from '../comment.service';
import { AnswerCreateDto, AnswerUpdateDto } from '../dto/answer.dto';
import { CommentCreateReferenceDto, CommentReferenceDto } from '../dto/comment-query.dto';
import { CommentCreateDto, CommentGetDto, CommentUpdateDto } from '../dto/comment.dto';
import { MarkAsDoneDto } from '../dto/mark-as-done.dto';

describe('CommentController', () => {
  let commentController: CommentController;
  let commentService: CommentService;

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
      controllers: [CommentController],
    })
      .useMocker((token) => {
        if (typeof token === 'function') {
          return Object.fromEntries(
            Object.getOwnPropertyNames(token.prototype)
              .filter((key) => key !== 'constructor')
              .map((key) => [key, jest.fn()]),
          );
        }
      })
      .compile();

    commentService = moduleRef.get<CommentService>(CommentService);
    commentController = moduleRef.get<CommentController>(CommentController);
  });

  describe('findComments', () => {
    it('should return the comments', async () => {
      const commentReferenceDto = new CommentReferenceDto();
      const result = [new CommentGetDto()];
      jest.spyOn(commentService, 'findForItem').mockResolvedValue(result);

      const call = commentController.findComments(request, commentReferenceDto);
      expect(await call).toBe(result);
      expect(commentService.findForItem).toHaveBeenCalledWith(commentReferenceDto, request.user);
    });
  });

  describe('create', () => {
    it('should create the comment', async () => {
      const reference = new CommentCreateReferenceDto();
      const result = new CommentGetDto();
      const input = new CommentCreateDto();

      jest.spyOn(commentService, 'create').mockResolvedValue(result);

      const call = commentController.create(request, reference, input);
      expect(await call).toBe(result);
      expect(commentService.create).toHaveBeenCalledWith(input, reference, request.user);
    });
  });

  describe('updateComment', () => {
    it('should update the comment', async () => {
      const params = {
        id: 'mongoId',
      };
      const result = new CommentGetDto();
      const input = new CommentUpdateDto();

      jest.spyOn(commentService, 'updateComment').mockResolvedValue(result);

      const call = commentController.updateComment(params, input, request);
      expect(await call).toBe(result);
      expect(commentService.updateComment).toHaveBeenCalledWith(params.id, input, request.user);
    });
  });

  describe('deleteComment', () => {
    it('should delete the comment', async () => {
      const params = {
        id: 'mongoId',
      };
      const result = undefined;

      jest.spyOn(commentService, 'deleteComment').mockResolvedValue();

      const call = commentController.deleteComment(params, request);
      expect(await call).toBe(result);
      expect(commentService.deleteComment).toHaveBeenCalledWith(params.id, request.user);
    });
  });

  describe('markCommentAsDone', () => {
    it('should mark the comment as done', async () => {
      const params = {
        id: 'mongoId',
      };

      const input = new MarkAsDoneDto();
      const result = undefined;

      jest.spyOn(commentService, 'markCommentAsDone').mockResolvedValue();

      const call = commentController.markCommentAsDone(params, input, request);
      expect(await call).toBe(result);
      expect(commentService.markCommentAsDone).toHaveBeenCalledWith(params.id, input.value, request.user);
    });
  });

  describe('createAnswer', () => {
    it('should create an answer', async () => {
      const params = {
        id: 'mongoId',
      };

      const input = new AnswerCreateDto();
      const result = new CommentGetDto();

      jest.spyOn(commentService, 'createAnswer').mockResolvedValue(result);

      const call = commentController.createAnswer(request, params, input);
      expect(await call).toBe(result);
      expect(commentService.createAnswer).toHaveBeenCalledWith(input, params.id, request.user);
    });
  });

  describe('updateAnswer', () => {
    it('should update an answer', async () => {
      const params = {
        mainId: 'mainId-mongoId',
        subId: 'subId-mongoId',
      };

      const input = new AnswerUpdateDto();
      const result = new CommentGetDto();

      jest.spyOn(commentService, 'updateAnswer').mockResolvedValue(result);

      const call = commentController.updateAnswer(params, input, request);
      expect(await call).toBe(result);
      expect(commentService.updateAnswer).toHaveBeenCalledWith(params.mainId, params.subId, input, request.user);
    });
  });

  describe('deleteAnswer', () => {
    it('should delete an answer', async () => {
      const params = {
        mainId: 'mainId-mongoId',
        subId: 'subId-mongoId',
      };

      const result = new CommentGetDto();

      jest.spyOn(commentService, 'deleteAnswer').mockResolvedValue(result);

      const call = commentController.deleteAnswer(params, request);
      expect(await call).toBe(result);
      expect(commentService.deleteAnswer).toHaveBeenCalledWith(params.mainId, params.subId, request.user);
    });
  });

  describe('markAnswerAsDone', () => {
    it('should delete an answer', async () => {
      const params = {
        mainId: 'mainId-mongoId',
        subId: 'subId-mongoId',
      };

      const input = new MarkAsDoneDto();
      const result = undefined;
      jest.spyOn(commentService, 'markAnswerAsDone').mockResolvedValue(result);

      const call = commentController.markAnswerAsDone(params, input, request);
      expect(await call).toBe(result);
      expect(commentService.markAnswerAsDone).toHaveBeenCalledWith(
        params.mainId,
        params.subId,
        input.value,
        request.user,
      );
    });
  });
});
