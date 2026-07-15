export const SEARCH_INDEX_SCHEMA_VERSION = 'v1'

const SEARCH_INDEX_GENERATION_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/

export function buildSearchGenerationIndexName(stableAliasName: string, generation: string): string {
  if (!SEARCH_INDEX_GENERATION_PATTERN.test(generation)) {
    throw new RangeError('Search index generation must be a lowercase bounded identifier')
  }

  return `${stableAliasName}_${SEARCH_INDEX_SCHEMA_VERSION}_${generation}`
}
