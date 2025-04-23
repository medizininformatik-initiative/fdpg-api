import { isObject } from 'class-validator';
import { ProposalUpdateDto } from '../dto/proposal/proposal.dto';
import { ProposalDocument } from '../schema/proposal.schema';
import { isDeepStrictEqual } from 'util';

const removeObsoleteArrayMember = (target: any[], source: any[]) => {
  try {
    const spliceOut = [];
    target.forEach((targetItem, targetIndex) => {
      if (!targetItem || !targetItem._id) {
        spliceOut.push(targetIndex);
        return;
      }

      // Safely convert target ID to string
      const targetId = targetItem._id.toString ? targetItem._id.toString() : String(targetItem._id);

      // Find matching source item by ID
      const sourceIndex = source.findIndex((sourceItem) => {
        if (!sourceItem || !sourceItem._id) return false;
        // Convert source ID to string for comparison
        const sourceId = sourceItem._id.toString ? sourceItem._id.toString() : String(sourceItem._id);
        return sourceId === targetId;
      });

      if (sourceIndex === -1) {
        // Collect obsolete
        spliceOut.push(targetIndex);
      }
    });

    // Remove obsolete from end to start
    spliceOut.sort((a, b) => b - a);
    spliceOut.forEach((targetIndex) => target.splice(targetIndex, 1));
  } catch (error) {
    console.error('Error in removeObsoleteArrayMember:', error);
  }
};

const updateAndAddArrayMembers = (target: any[], source: any[], arrayName?: string) => {
  try {
    source.forEach((sourceItem, sourceIndex) => {
      if (!sourceItem || !sourceItem._id) return;

      // Safely convert source ID to string
      const sourceId = sourceItem._id.toString ? sourceItem._id.toString() : String(sourceItem._id);

      const targetIndex = target.findIndex((targetItem) => {
        if (!targetItem || !targetItem._id) return false;
        // Convert target ID to string for comparison
        const targetId = targetItem._id.toString ? targetItem._id.toString() : String(targetItem._id);
        return targetId === sourceId;
      });

      if (targetIndex !== -1) {
        // Updating existing
        mergeDeep(target[targetIndex], source[sourceIndex]);
      } else {
        // Adding non existing at the end
        // Special case for selectedDataSources - keep the _id for this array only
        if (arrayName === 'selectedDataSources') {
          target.push({
            ...source[sourceIndex],
          });
        } else {
          // For all other arrays, set _id to undefined (original behavior)
          target.push({
            ...source[sourceIndex],
            _id: undefined,
          });
        }
      }
    });
  } catch (error) {
    console.error('Error in updateAndAddArrayMembers:', error);
  }
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

  try {
    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        // Special handling for selectedDataSources array
        if (key === 'selectedDataSources') {
          if (Array.isArray(source[key])) {
            // Use special handling for selectedDataSources
            if (!Array.isArray(target[key])) {
              target[key] = [];
            }
            removeObsoleteArrayMember(target[key], source[key]);
            updateAndAddArrayMembers(target[key], source[key], 'selectedDataSources');
          }
          continue;
        }

        if (isObject<any>(source[key]) && typeof source[key]?.getMonth !== 'function') {
          if (!target[key]) Object.assign(target, { [key]: {} });

          mergeDeep(target[key], source[key]);
        } else {
          const isSourceArray = Array.isArray(source[key]);
          // Check if source array has at least one item and that item has an _id property
          const isSourceArrayWithId =
            isSourceArray && source[key].length > 0 && source[key].some((item) => item && item._id);
          const isTargetArray = Array.isArray(target[key]);

          if (isTargetArray && isSourceArrayWithId) {
            removeObsoleteArrayMember(target[key], source[key]);
            updateAndAddArrayMembers(target[key], source[key], key);
          } else if (isSourceArrayWithId && target[key] === undefined) {
            target[key] = [];
            updateAndAddArrayMembers(target[key], source[key], key);
          } else {
            Object.assign(target, { [key]: source[key] });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in mergeDeep:', error);
  }

  return mergeDeep(target, ...sources);
};

/**
 * Will merge the DTO into the ProposalDocument and set the proposal version
 * @param dbItem ProposalDocument
 * @param apiItem ProposalUpdateDto
 */
export const mergeProposal = (dbItem: ProposalDocument, apiItem: ProposalUpdateDto): void => {
  try {
    // Special handling for variableSelection
    if (
      !!dbItem.userProject?.variableSelection &&
      !!apiItem.userProject?.variableSelection &&
      !isDeepStrictEqual(dbItem.userProject?.variableSelection, apiItem.userProject?.variableSelection)
    ) {
      dbItem.markModified('userProject.variableSelection');
    }

    // If selectedDataSources is being updated, mark it as modified
    if (apiItem.selectedDataSources) {
      dbItem.markModified('selectedDataSources');
    }

    mergeDeep(dbItem, apiItem);

    if (dbItem.modifiedPaths().length) {
      // Mayor Version gets increased when the status is moved into ProposalStatus.FdpgCheck
      // Change is done in status-change-effects
      dbItem.version.minor++;
    }
  } catch (error) {
    console.error('Error in mergeProposal:', error);
    throw error;
  }
};
