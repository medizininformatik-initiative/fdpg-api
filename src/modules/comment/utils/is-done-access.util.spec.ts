import { Role } from 'src/shared/enums/role.enum';
import { CommentType } from '../enums/comment-type.enum';
import { NoErrorThrownError, getError } from 'test/get-error';
import { validateIsDoneAccess } from './is-done-access.util';
import { ForbiddenException } from '@nestjs/common';

describe('validateIsDoneAccess', () => {
  describe('Comments', () => {
    const tests = [CommentType.ProposalMessageToLocation, CommentType.ProposalMessageToOwner];
    test.each(tests)(
      'should throw an error if the user is not allowed to set the isDone field (type: %s)',
      async (commentType) => {
        const call = async () => await validateIsDoneAccess(commentType, Role.Admin);
        const error = await getError(call);

        expect(error).toBeDefined();
        expect(error).not.toBeInstanceOf(NoErrorThrownError);
        expect(error).toBeInstanceOf(ForbiddenException);
      },
    );
  });
  describe('Tasks', () => {
    const tests = [CommentType.ProposalTask, CommentType.ProposalTaskFdpg];
    test.each(tests)(
      'should throw an error if the user is not allowed to set the isDone field (type: %s)',
      async (commentType) => {
        const call = async () => await validateIsDoneAccess(commentType, Role.Admin);
        const error = await getError(call);

        expect(error).toBeDefined();
        expect(error).not.toBeInstanceOf(NoErrorThrownError);
        expect(error).toBeInstanceOf(ForbiddenException);
      },
    );
  });
});
