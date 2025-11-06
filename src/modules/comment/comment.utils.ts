import { NotFoundException } from '@nestjs/common';
import { ValidationException } from 'src/exceptions/validation/validation.exception';
import { ValidationErrorInfo } from 'src/shared/dto/validation/validation-error-info.dto';
import { BadRequestError } from 'src/shared/enums/bad-request-error.enum';
import { Role } from 'src/shared/enums/role.enum';
import { IRequestUser } from 'src/shared/types/request-user.interface';
import { Answer } from './schema/answer.schema';
import { CommentDocument } from './schema/comment.schema';

/**
 * Checks if the current user is allowed to answer to a comment.
 * It should not be possible to answer to comments of same "level" (role / location)
 * @param comment Main CommentDocument
 * @param user Answering user
 */
export const validateAnswer = (comment: CommentDocument, user: IRequestUser): void => {
  let shouldThrow = false;
  let property = '';
  if (comment.owner.role === user.singleKnownRole) {
    shouldThrow = true;
    property = 'ROLE';
  }

  if (user.isFromLocation && comment.owner.role !== Role.FdpgMember && comment.owner.role !== Role.DataSourceMember) {
    shouldThrow = true;
    property = 'LOCATION';
  }

  if (shouldThrow) {
    const errorInfo = new ValidationErrorInfo({
      constraint: 'canNotAnswerSelf',
      message: 'One role or one location can not answer to comments of the same role or location',
      property,
      code: BadRequestError.CommentOneCanNotAnswerSelf,
    });
    throw new ValidationException([errorInfo]);
  }
};

export const filterAllowedAnswers = (user: IRequestUser, comment: CommentDocument) => {
  if (user.isFromLocation) {
    return comment.answers.filter((answer) =>
      answer.locations.some((location) => {
        return location === user.miiLocation;
      }),
    );
  } else {
    return comment.answers;
  }
};

/**
 * Collects and distinct the MiiLocations of the answers of a comment
 * @param mainComment Main CommentDocument
 * @returns MiiLocations of all comments
 */
export const getAnswersLocations = (mainComment: CommentDocument): string[] => {
  const answersLocations = mainComment.answers.reduce((locSet, answer) => {
    answer.locations.forEach((location) => {
      if (location) {
        locSet.add(location);
      }
    });
    return locSet;
  }, new Set<string>(mainComment.locations));

  return [...answersLocations];
};

interface IGetAnswer {
  answer: Answer;
  answerIndex: number;
}
/**
 * Gets the answer and its index by its id and throws if not found.
 * @param mainComment Main CommentDocument
 * @param answerId Id of the answer
 * @returns The answer and the index of the answer
 */
export const getAnswer = (mainComment: CommentDocument, answerId: string): IGetAnswer => {
  const answerIndex = mainComment.answers.findIndex((answer) => answer._id.toString() === answerId);

  if (answerIndex === -1) {
    throw new NotFoundException();
  }

  const answer = mainComment.answers[answerIndex];

  return { answer, answerIndex };
};
