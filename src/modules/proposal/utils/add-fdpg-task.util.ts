import { FdpgTaskGetDto } from '../dto/proposal/fdpg-task.dto';
import { FdpgTaskType } from '../enums/fdpg-task-type.enum';
import { Proposal } from '../schema/proposal.schema';
import { Types } from 'mongoose';

export const addFdpgTaskAndReturnId = (proposal: Proposal, type: FdpgTaskType): string => {
  const addAndReturn = () => {
    const task: FdpgTaskGetDto = {
      type,
      _id: new Types.ObjectId().toString(),
    };

    proposal.openFdpgTasks.push(task);
    proposal.openFdpgTasksCount = proposal.openFdpgTasks.length;
    return task._id;
  };

  // Some Tasks are persistent and should only exist once
  if (type !== FdpgTaskType.Comment && type !== FdpgTaskType.ConditionApproval) {
    const isTaskExisting = proposal.openFdpgTasks.find((task) => task.type === type);

    if (!isTaskExisting) {
      // If the task is not already existing
      return addAndReturn();
    }
  } else {
    // Comments and Conditional Approval can exist multiple times
    return addAndReturn();
  }

  // If nothing was added
  return undefined;
};

export const removeFdpgTask = (proposal: Proposal, taskId: string): void => {
  const taskIndex = proposal.openFdpgTasks.findIndex((task) => task._id.toString() === taskId);
  if (taskIndex !== -1) {
    proposal.openFdpgTasks.splice(taskIndex, 1);
  }
  proposal.openFdpgTasksCount = proposal.openFdpgTasks.length;
};

export const removeFdpgTasksForContracting = (proposal: Proposal): void => {
  const toBeRemoved = [
    FdpgTaskType.ConditionApproval,
    FdpgTaskType.UacApprovalComplete,
    FdpgTaskType.DataAmountReached,
    FdpgTaskType.DueDateReached,
  ];

  toBeRemoved.forEach((type) => removeFdpgTaskByType(proposal, type));
};

export const removeFdpgTasksForDataDelivery = (proposal: Proposal): void => {
  const toBeRemoved = [FdpgTaskType.ContractComplete, FdpgTaskType.DueDateReached];

  toBeRemoved.forEach((type) => removeFdpgTaskByType(proposal, type));
};

export const removeFdpgTaskByType = (proposal: Proposal, type: FdpgTaskType): void => {
  const taskIndex = proposal.openFdpgTasks.findIndex((task) => task.type === type);
  if (taskIndex !== -1) {
    proposal.openFdpgTasks.splice(taskIndex, 1);
  }
  proposal.openFdpgTasksCount = proposal.openFdpgTasks.length;
};
