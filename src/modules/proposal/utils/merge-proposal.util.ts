import { isObject } from 'class-validator';
import { ProposalUpdateDto } from '../dto/proposal/proposal.dto';
import { ProposalDocument } from '../schema/proposal.schema';
import { isDeepStrictEqual } from 'util';

const removeObsoleteArrayMember = (target: any[], source: any[]) => {
  const spliceOut = [];
  target.forEach((targetItem, targetIndex) => {
    const sourceIndex = source.findIndex((sourceItem) => sourceItem._id === targetItem._id.toString());
    if (sourceIndex === -1) {
      // Collect obsolete
      spliceOut.push(targetIndex);
    }
  });

  // Remove obsolete from end to start
  spliceOut.sort((a, b) => b - a);
  spliceOut.forEach((targetIndex) => target.splice(targetIndex, 1));
};

const updateAndAddArrayMembers = (target: any[], source: any[]) => {
  source.forEach((sourceItem, sourceIndex) => {
    const targetIndex = target.findIndex((targetItem) => targetItem._id.toString() === sourceItem._id);
    if (targetIndex !== -1) {
      // Updating existing
      mergeDeep(target[targetIndex], source[sourceIndex]);
    } else {
      // Adding non existing at the end

      target.push({
        ...source[sourceIndex],
        _id: undefined,
      });
    }
  });
};

/**
 * This merge is supposed to keep the references from the target, so mongodb would not generate new ids for sub-schema.
 * We need to keep the original ids to reference other documents like the tasks.
 * @param target The target item. This should be the database object
 * @param sources The source. This should be the API DTO
 * @returns Will return the updated target item.
 */
const mergeDeep = (target, ...sources) => {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (key === 'variableSelection' || key === 'DIFE') {
        console.log({
          key,
          target,
          source,
          targetT: typeof target[key],
          sourceT: typeof source[key],
          targetB: isObject(target[key]),
          sourceB: isObject(source[key]),
          keyT: typeof key,
          types: Object.keys(target).map((k) => ({ k, t: typeof k })),
        });
      }

      if (isObject<any>(source[key]) && typeof source[key].getMonth !== 'function') {
        if (!target[key]) Object.assign(target, { [key]: {} });

        mergeDeep(target[key], source[key]);
      } else {
        const isSourceArray = Array.isArray(source[key]);
        const isSourceArrayWithId = isSourceArray && source[key][0] && source[key][0]._id;
        const isTargetArray = Array.isArray(target[key]);

        if (key === 'variableSelection' || key === 'DIFE') {
          console.log({ isSourceArray, isSourceArrayWithId, isTargetArray });
        }

        if (isTargetArray && isSourceArrayWithId) {
          removeObsoleteArrayMember(target[key], source[key]);
          updateAndAddArrayMembers(target[key], source[key]);
        } else if (isSourceArrayWithId && target[key] === undefined) {
          target[key] = [];
          updateAndAddArrayMembers(target[key], source[key]);
        } else {
          if (key === 'variableSelection' || key === 'DIFE') {
            console.log('assign');
          }

          Object.assign(target, { [key]: source[key] });
        }
      }
    }
  }

  return mergeDeep(target, ...sources);
};

/**
 * Will merge the DTO into the ProposalDocument and set the proposal version
 * @param dbItem ProposalDocument
 * @param apiItem ProposalUpdateDto
 */
export const mergeProposal = (dbItem: ProposalDocument, apiItem: ProposalUpdateDto): void => {
  if (
    !!dbItem.userProject?.typeOfUse?.pseudonymizationInfoTexts &&
    !!apiItem.userProject?.typeOfUse?.pseudonymizationInfoTexts &&
    !isDeepStrictEqual(
      dbItem.userProject?.typeOfUse?.pseudonymizationInfoTexts,
      apiItem.userProject?.typeOfUse?.pseudonymizationInfoTexts,
    )
  ) {
    dbItem.markModified('userProject.typeOfUse.pseudonymizationInfoTexts');
  }

  mergeDeep(dbItem, apiItem);

  if (dbItem.modifiedPaths().length) {
    // Mayor Version gets increased when the status is moved into ProposalStatus.FdpgCheck
    // Change is done in status-change-effects
    dbItem.version.minor++;
  }
};
