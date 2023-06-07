import { isObject } from 'class-validator';
import { IsDoneDetailGetDto, IsDoneOverviewGetDto } from '../dto/is-done-overview';
import { Proposal } from '../schema/proposal.schema';

const getResultItem = (path: string, value: boolean, _id: string): IsDoneDetailGetDto => {
  return {
    path,
    value,
    _id,
  };
};
const findIsDone = (obj: Proposal, path?: string) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const pathToValue = (path ? `${path}.` : '') + key;

    if (key === 'isDone') {
      acc.push(getResultItem(pathToValue, value, obj._id));
    } else if (Array.isArray(obj[key])) {
      const items = obj[key]
        .map((item, index) => {
          const pathToArray = pathToValue + `[${index}]`;
          return findIsDone(item, pathToArray);
        })
        .filter((item) => item.length)
        .flat(10);
      acc.push(...items);
    } else if (isObject(obj[key]) && typeof obj[key].getMonth !== 'function') {
      acc.push(...findIsDone(obj[key], pathToValue));
    }

    return acc;
  }, [] as IsDoneDetailGetDto[]);
};

export const getIsDoneOverview = (proposal: Proposal): IsDoneOverviewGetDto => {
  const allFields = findIsDone(proposal);
  return {
    fieldCount: allFields.length,
    isDoneCount: allFields.filter((field) => field.value === true).length,
    fields: allFields,
  };
};
