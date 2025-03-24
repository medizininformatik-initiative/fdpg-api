import { DueDateEnum } from '../../enums/due-date.enum';
import { ProposalStatus } from '../../enums/proposal-status.enum';
import { beforeDeadlineDateConstrains, isDateChangeValid, isDateOrderValid } from '../due-date-verification.util';

describe('due-date-verification.util', () => {
  it(`should not detect circular dependency`, () => {
    // A circular dependency in rules would result in a never ending recursion

    Object.keys(beforeDeadlineDateConstrains).forEach((entryKey) => {
      const alreadyDetectedKeys = new Set(entryKey);

      var result = entryKey;

      while (result) {
        result = beforeDeadlineDateConstrains[result];
        if (alreadyDetectedKeys.has(result)) {
          throw new Error(
            `circular dependency detected for entry key '${entryKey}'. '${result}' appears at least twice.`,
          );
        } else {
          alreadyDetectedKeys.add(result);
        }
      }

      result = null;
    });
  });

  it(`should validate the order`, () => {
    const updatedDeadlines = {
      [DueDateEnum.DUE_DAYS_FDPG_CHECK]: new Date(2027, 7, 17),
      [DueDateEnum.DUE_DAYS_LOCATION_CHECK]: new Date(2027, 7, 16),
    } as Record<DueDateEnum, Date>;

    expect(isDateOrderValid(updatedDeadlines)).toBeFalsy();
  });

  it(`should deny the update permissions`, () => {
    const updatedDeadlines = {
      [DueDateEnum.DUE_DAYS_FDPG_CHECK]: new Date(2027, 7, 17),
      [DueDateEnum.DUE_DAYS_LOCATION_CHECK]: new Date(2027, 7, 16),
    } as Record<DueDateEnum, Date>;

    const status = ProposalStatus.Contracting;

    expect(isDateChangeValid(updatedDeadlines, status)).toBeFalsy();
  });
});
