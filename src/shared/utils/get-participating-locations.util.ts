import { Proposal } from 'src/modules/proposal/schema/proposal.schema';

export const reduceParticipatingLocations = (proposal: Proposal, locations: string[]) => {
  return locations.reduce(
    (acc, location) => {
      const isSigned = () => proposal.signedContracts?.includes(location);
      const isUacApproved = () => proposal.uacApprovedLocations?.includes(location);
      const isDizApproved = () => proposal.dizApprovedLocations?.includes(location);
      const isOpenDizCheck = () => proposal.openDizChecks?.includes(location);

      if (isDizApproved() || isUacApproved() || isSigned()) {
        acc.diz.push(location);
        acc.uac.push(location);
      } else if (isOpenDizCheck()) {
        acc.diz.push(location);
      }
      return acc;
    },
    { diz: [], uac: [] },
  );
};
