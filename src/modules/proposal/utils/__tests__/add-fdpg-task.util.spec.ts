import { FdpgTaskType } from '../../enums/fdpg-task-type.enum';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { ProposalDocument } from '../../schema/proposal.schema';
import {
  addFdpgTaskAndReturnId,
  removeFdpgTask,
  removeFdpgTasksForContracting,
  removeFdpgTasksForDataDelivery,
} from '../add-fdpg-task.util';

describe('addFdpgTaskUtil', () => {
  const proposalId = 'proposalId';

  const proposalContent = {
    _id: proposalId,
    projectAbbreviation: 'projectAbbreviation',
    status: ProposalStatus.FdpgCheck,
    openFdpgTasks: [],
    openFdpgTasksCount: 0,
  };
  const getProposalDocument = () => {
    const proposalDocument = {
      ...JSON.parse(JSON.stringify(proposalContent)),
    };
    return proposalDocument as any as ProposalDocument;
  };

  describe('addFdpgTask', () => {
    it('should add a new task for a comment', () => {
      const proposal = getProposalDocument();
      const type = FdpgTaskType.Comment;

      addFdpgTaskAndReturnId(proposal, type);

      expect(proposal.openFdpgTasks.length).toEqual(1);
      expect(proposal.openFdpgTasksCount).toEqual(1);

      expect(proposal.openFdpgTasks[0].type).toEqual(type);
      expect(proposal.openFdpgTasks[0]._id).toBeDefined();
    });

    it('should add a new task for due date reached', () => {
      const proposal = getProposalDocument();
      const type = FdpgTaskType.DueDateReached;

      addFdpgTaskAndReturnId(proposal, type);

      expect(proposal.openFdpgTasks.length).toEqual(1);
      expect(proposal.openFdpgTasksCount).toEqual(1);

      expect(proposal.openFdpgTasks[0].type).toEqual(type);
      expect(proposal.openFdpgTasks[0]._id).toBeDefined();
    });

    it('should not add a new task for due date reached if already existing', () => {
      const proposal = getProposalDocument();
      proposal.openFdpgTasks = [
        {
          type: FdpgTaskType.DueDateReached,
          _id: 'id',
        },
      ];
      const type = FdpgTaskType.DueDateReached;

      const result = addFdpgTaskAndReturnId(proposal, type);

      expect(result).toBeUndefined();
    });
  });

  describe('removeFdpgTask', () => {
    it('should remove a task if existing', () => {
      const proposal = getProposalDocument();
      const taskId = 'taskId';
      proposal.openFdpgTasks = [
        {
          type: FdpgTaskType.DueDateReached,
          _id: taskId,
        },
      ];
      proposal.openFdpgTasksCount = 1;

      removeFdpgTask(proposal, taskId);
      expect(proposal.openFdpgTasks.length).toEqual(0);
      expect(proposal.openFdpgTasks.length).toEqual(0);
    });

    it('should re validate the task count if not existing task', () => {
      const proposal = getProposalDocument();
      const taskId = 'taskId';
      proposal.openFdpgTasks = [
        {
          type: FdpgTaskType.DueDateReached,
          _id: 'otherId',
        },
      ];
      proposal.openFdpgTasksCount = 2;

      removeFdpgTask(proposal, taskId);
      expect(proposal.openFdpgTasks.length).toEqual(1);
      expect(proposal.openFdpgTasks.length).toEqual(1);
    });
  });

  describe('removeFdpgTasksForContracting', () => {
    it('should remove all tasks for contracting', () => {
      const proposal = getProposalDocument();
      proposal.openFdpgTasks = [
        {
          type: FdpgTaskType.DueDateReached,
          _id: 'taskId1',
        },
        {
          type: FdpgTaskType.Comment,
          _id: 'taskId2',
        },
        {
          type: FdpgTaskType.ConditionApproval,
          _id: 'taskId3',
        },
        {
          type: FdpgTaskType.UacApprovalComplete,
          _id: 'taskId4',
        },
        {
          type: FdpgTaskType.DataAmountReached,
          _id: 'taskId5',
        },
      ];
      proposal.openFdpgTasksCount = 4;

      removeFdpgTasksForContracting(proposal);
      expect(proposal.openFdpgTasks.length).toEqual(1);
      expect(proposal.openFdpgTasksCount).toEqual(1);
      expect(proposal.openFdpgTasks[0].type).toEqual(FdpgTaskType.Comment);
    });
  });

  describe('removeFdpgTasksForDataDelivery', () => {
    it('should remove all tasks for data delivery', () => {
      const proposal = getProposalDocument();
      proposal.openFdpgTasks = [
        {
          type: FdpgTaskType.DueDateReached,
          _id: 'taskId1',
        },
        {
          type: FdpgTaskType.Comment,
          _id: 'taskId2',
        },
        {
          type: FdpgTaskType.ContractComplete,
          _id: 'taskId3',
        },
      ];
      proposal.openFdpgTasksCount = 3;

      removeFdpgTasksForDataDelivery(proposal);
      expect(proposal.openFdpgTasks.length).toEqual(1);
      expect(proposal.openFdpgTasksCount).toEqual(1);
      expect(proposal.openFdpgTasks[0].type).toEqual(FdpgTaskType.Comment);
    });
  });
});
