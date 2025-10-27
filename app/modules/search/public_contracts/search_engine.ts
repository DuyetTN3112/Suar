import { SearchOrganizationsViaEngineQuery } from '#modules/search/actions/queries/search_organizations_via_engine_query'
import { SearchProjectsViaEngineQuery } from '#modules/search/actions/queries/search_projects_via_engine_query'
import { SearchPublicTasksViaEngineQuery } from '#modules/search/actions/queries/search_public_tasks_via_engine_query'
import { SearchSkillsViaEngineQuery } from '#modules/search/actions/queries/search_skills_via_engine_query'
import { SearchTalentsViaEngineQuery } from '#modules/search/actions/queries/search_talents_via_engine_query'
import { SearchTasksViaEngineQuery } from '#modules/search/actions/queries/search_tasks_via_engine_query'
import { SearchUsersViaEngineQuery } from '#modules/search/actions/queries/search_users_via_engine_query'
import { isSearchEnabled } from '#modules/search/infra/search_client'

export interface SearchTextInput {
  q: string
  limit: number
}

export interface SearchOrganizationTaskInput extends SearchTextInput {
  organizationId: string
}

export interface SearchProjectCandidate {
  projectId: string
  score: number
}

export interface SearchUserCandidate {
  userId: string
  score: number
}

export interface SearchOrganizationCandidate {
  organizationId: string
  score: number
}

export interface SearchTaskCandidate {
  taskId: string
  score: number
}

export interface SearchSkillCandidate {
  skillId: string
  score: number
}

const searchProjectsQuery = new SearchProjectsViaEngineQuery()
const searchUsersQuery = new SearchUsersViaEngineQuery()
const searchOrganizationsQuery = new SearchOrganizationsViaEngineQuery()
const searchTasksQuery = new SearchTasksViaEngineQuery()
const searchPublicTasksQuery = new SearchPublicTasksViaEngineQuery()
const searchTalentsQuery = new SearchTalentsViaEngineQuery()
const searchSkillsQuery = new SearchSkillsViaEngineQuery()

export function isSearchRuntimeEnabled(): boolean {
  return isSearchEnabled()
}

export async function searchProjectsViaEngine(
  input: SearchTextInput
): Promise<SearchProjectCandidate[]> {
  return searchProjectsQuery.handle(input)
}

export async function searchUsersViaEngine(
  input: SearchTextInput
): Promise<SearchUserCandidate[]> {
  return searchUsersQuery.handle(input)
}

export async function searchOrganizationsViaEngine(
  input: SearchTextInput
): Promise<SearchOrganizationCandidate[]> {
  return searchOrganizationsQuery.handle(input)
}

export async function searchTasksViaEngine(
  input: SearchOrganizationTaskInput
): Promise<SearchTaskCandidate[]> {
  return searchTasksQuery.handle(input)
}

export async function searchPublicTasksViaEngine(
  input: SearchTextInput
): Promise<SearchTaskCandidate[]> {
  return searchPublicTasksQuery.handle(input)
}

export async function searchTalentsViaEngine(
  input: SearchTextInput
): Promise<SearchUserCandidate[]> {
  return searchTalentsQuery.handle(input)
}

export async function searchSkillsViaEngine(
  input: SearchTextInput
): Promise<SearchSkillCandidate[]> {
  return searchSkillsQuery.handle(input)
}
