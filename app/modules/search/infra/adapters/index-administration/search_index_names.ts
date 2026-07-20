import { buildSearchIndexName } from '#config/search'
import type { SearchIndexDescriptor } from '#modules/search/actions/ports/outbound/search_index_administration_port'
import { SEARCH_INDEX_SCHEMA_VERSION } from '#modules/search/public_contracts/search_index_naming'

export { buildSearchGenerationIndexName } from '#modules/search/public_contracts/search_index_naming'

const SEARCH_INDEX_GENERATION_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/

export function buildTalentSearchIndexName(): string {
  return buildSearchIndexName('talents')
}

export function buildTalentSearchPhysicalIndexName(): string {
  return buildSearchIndexName(`talents_${SEARCH_INDEX_SCHEMA_VERSION}`)
}

export function buildTaskSearchIndexName(): string {
  return buildSearchIndexName('tasks')
}

export function buildTaskSearchPhysicalIndexName(): string {
  return buildSearchIndexName(`tasks_${SEARCH_INDEX_SCHEMA_VERSION}`)
}

export function buildProjectSearchIndexName(): string {
  return buildSearchIndexName('projects')
}

export function buildProjectSearchPhysicalIndexName(): string {
  return buildSearchIndexName(`projects_${SEARCH_INDEX_SCHEMA_VERSION}`)
}

export function buildSkillSearchIndexName(): string {
  return buildSearchIndexName('skills')
}

export function buildSkillSearchPhysicalIndexName(): string {
  return buildSearchIndexName(`skills_${SEARCH_INDEX_SCHEMA_VERSION}`)
}

export function buildOrganizationSearchIndexName(): string {
  return buildSearchIndexName('organizations')
}

export function buildOrganizationSearchPhysicalIndexName(): string {
  return buildSearchIndexName(`organizations_${SEARCH_INDEX_SCHEMA_VERSION}`)
}

export function buildUserDirectorySearchIndexName(): string {
  return buildSearchIndexName('users')
}

export function buildUserDirectorySearchPhysicalIndexName(): string {
  return buildSearchIndexName(`users_${SEARCH_INDEX_SCHEMA_VERSION}`)
}

export function isOwnedSearchPhysicalIndex(
  descriptor: Pick<SearchIndexDescriptor, 'aliasName' | 'initialPhysicalIndexName'>,
  physicalIndexName: string
): boolean {
  if (physicalIndexName === descriptor.initialPhysicalIndexName) {
    return true
  }

  const generationPrefix = `${descriptor.aliasName}_${SEARCH_INDEX_SCHEMA_VERSION}_`
  if (!physicalIndexName.startsWith(generationPrefix)) {
    return false
  }

  return SEARCH_INDEX_GENERATION_PATTERN.test(physicalIndexName.slice(generationPrefix.length))
}

export function buildSearchIndexDescriptors(): SearchIndexDescriptor[] {
  return [
    {
      target: 'talents',
      aliasName: buildTalentSearchIndexName(),
      initialPhysicalIndexName: buildTalentSearchPhysicalIndexName(),
    },
    {
      target: 'tasks',
      aliasName: buildTaskSearchIndexName(),
      initialPhysicalIndexName: buildTaskSearchPhysicalIndexName(),
    },
    {
      target: 'projects',
      aliasName: buildProjectSearchIndexName(),
      initialPhysicalIndexName: buildProjectSearchPhysicalIndexName(),
    },
    {
      target: 'skills',
      aliasName: buildSkillSearchIndexName(),
      initialPhysicalIndexName: buildSkillSearchPhysicalIndexName(),
    },
    {
      target: 'organizations',
      aliasName: buildOrganizationSearchIndexName(),
      initialPhysicalIndexName: buildOrganizationSearchPhysicalIndexName(),
    },
    {
      target: 'users',
      aliasName: buildUserDirectorySearchIndexName(),
      initialPhysicalIndexName: buildUserDirectorySearchPhysicalIndexName(),
    },
  ]
}
