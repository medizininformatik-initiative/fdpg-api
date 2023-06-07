export const removeInPlaceAndReturnRemoved = <T>(arr: T[], condition: (arrMember: T) => boolean) => {
  let i = arr.length;
  const removed: T[] = [];
  while (i--) {
    if (condition(arr[i])) {
      removed.push(...arr.splice(i, 1));
    }
  }
  return removed;
};
