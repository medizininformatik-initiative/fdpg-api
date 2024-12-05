import { isNotEmpty } from 'class-validator';

interface IResult {
  ref: Record<string, any>;
  path: (string | number)[];
}
/**
 * Find some nested object by a key value pair.
 * @param target Some target object or array
 * @param key The search key
 * @param value The search value
 * @returns Returns the found object and path where the key matches the value.
 */
export const findByKeyNested = (
  target: Array<any> | object,
  key: string,
  value: string | number | boolean,
  pathAcc: (string | number)[] = [],
): IResult | undefined => {
  if (Array.isArray(target)) {
    let i = 0;
    for (const arrayMember of target) {
      const result = findByKeyNested(arrayMember, key, value, [...pathAcc, i]);
      if (result) {
        return result;
      }
      i++;
    }
  } else {
    if (target.hasOwnProperty(key) && target[key].toString() === value) {
      return { ref: target, path: pathAcc };
    }
    for (const nestedKey of Object.keys(target)) {
      if (typeof target[nestedKey] === 'object') {
        const nestedObject = findByKeyNested(target[nestedKey], key, value, [...pathAcc, nestedKey]);
        if (nestedObject && isNotEmpty(nestedObject.ref)) {
          return nestedObject;
        }
      }
    }
    return null;
  }
};
