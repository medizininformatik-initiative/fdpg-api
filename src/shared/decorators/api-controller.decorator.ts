import { applyDecorators, Controller, ControllerOptions, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/**
 * Find all hyphens that are followed by an alphanumeric character and for the first character
 */
const REGEX = /(^\w|-\w)/g;

/**
 * Removes the hypen and transforms the character to upper case
 * @param text Combination of the hyphen and the followed character
 * @returns The uppercasd character
 */
const toPascalCase = (text: string) => text.replace(/-/, '').toUpperCase();

/**
 * Shorthand Decorator for Controller and ApiTags
 * @param path The api-path for this controller
 * @param version
 * @returns nestjs/common Controller and nestjs/swagger ApiTags decorators
 */
export function ApiController(path: string, version: string | typeof VERSION_NEUTRAL = '1', group?: string) {
  const controllerOptions: ControllerOptions = {
    path,
    version: version,
  };

  const versionTag = version === VERSION_NEUTRAL || version === '1' ? '' : `v${version}`;

  const tag = path.replace(REGEX, toPascalCase);
  const groupTag = group ? `${tag} // ${group}` : tag;

  return applyDecorators(Controller(controllerOptions), ApiTags(`${groupTag} ${versionTag}`));
}
