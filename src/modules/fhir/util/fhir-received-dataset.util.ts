const getNestedValue = (obj, path) => {
  return path
    .split('.')
    .reduce((current, key) => (current && current[key] !== undefined ? current[key] : undefined), obj);
};

/**
 * Flattens a resource object, extracting direct properties and mapping
 * values from the complex 'input' array based on a configuration map.
 * @param {object} data - The source data object containing the resource.
 * @returns {object} The flattened JSON object.
 */
export const processReceivedDataSetResponse = (entry, INPUT_CODE_MAPPINGS) => {
  const resource = entry.resource;

  if (!resource) {
    console.error("Input data does not contain a 'resource' object.");
    return {};
  }

  // 1. Start with the direct properties from 'resource'
  const flatJson = {
    status: resource.status,
    intent: resource.intent,
    authoredOn: resource.authoredOn,
  };

  // 2. Process the 'input' array using the configuration map
  if (Array.isArray(resource.input)) {
    for (const inputItem of resource.input) {
      // Safely get the code used for lookup
      const code = inputItem.type?.coding?.[0]?.code;

      if (code && INPUT_CODE_MAPPINGS[code]) {
        const mapping = INPUT_CODE_MAPPINGS[code];

        // Check if the mapping is an array (for complex multi-field extraction)
        if (Array.isArray(mapping)) {
          for (const { targetKey, valuePath } of mapping) {
            const value = getNestedValue(inputItem, valuePath);
            if (value !== undefined) {
              flatJson[targetKey] = value;
            }
          }
        } else {
          const { targetKey, valuePath } = mapping;
          const value = getNestedValue(inputItem, valuePath);
          if (value !== undefined) {
            flatJson[targetKey] = value;
          }
        }
      }
    }
  }

  return flatJson;
};
