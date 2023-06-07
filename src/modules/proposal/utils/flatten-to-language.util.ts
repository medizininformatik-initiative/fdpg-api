import { SupportedLanguages } from 'src/shared/constants/global.constants';

export const flattenToLanguage = <T>(obj: Record<string, any>, lang: SupportedLanguages): T => {
  return Object.keys(obj).reduce((acc, key) => {
    const innerObj = obj[key];
    // Checking for the lang key could exceed the maximum call stack size if not present
    const isMostDeep = Object.keys(innerObj).some((innerKey) => typeof innerObj[innerKey] === 'string');
    acc[key] = isMostDeep ? innerObj[lang] : flattenToLanguage(innerObj, lang);
    return acc;
  }, {} as T);
};
