import { buildSearchIndexName } from '#config/search'

export function buildTalentSearchIndexName(): string {
  return buildSearchIndexName('talents_v1')
}

export function buildTaskSearchIndexName(): string {
  return buildSearchIndexName('tasks_v1')
}

export function buildProjectSearchIndexName(): string {
  return buildSearchIndexName('projects_v1')
}

export function buildSkillSearchIndexName(): string {
  return buildSearchIndexName('skills_v1')
}

export function buildOrganizationSearchIndexName(): string {
  return buildSearchIndexName('organizations_v1')
}

export function buildUserDirectorySearchIndexName(): string {
  return buildSearchIndexName('users_v1')
}
