import { searchTaskComments } from './comment_search.js'
import { SEARCH_SOURCE_RESULT_LIMIT, settleSearchSource } from './source_runner.js'
import type { GlobalSearchSourceName, GlobalSearchTaskCommentResult } from './types.js'

import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import {
  searchOrganizationsBasicList,
  type OrganizationDirectoryItem,
} from '#modules/organizations/public_contracts/organization_directory'
import { listProjects } from '#modules/projects/public_contracts/project_listing'
import {
  listActiveSkillsCatalog,
  type ActiveSkillCatalogItem,
} from '#modules/skills/public_contracts/active_skill_catalog'
import { listPublicTasks } from '#modules/tasks/public_contracts/public_task_listing'
import {
  searchTalents,
  type TalentSearchResult,
} from '#modules/users/public_contracts/talent_search'


export interface GlobalSearchSourceDependencies {
  readonly searchTalents?: typeof searchTalents
  readonly listPublicTasks?: typeof listPublicTasks
  readonly listProjects?: typeof listProjects
  readonly listActiveSkillsCatalog?: typeof listActiveSkillsCatalog
  readonly searchOrganizationsBasicList?: typeof searchOrganizationsBasicList
  readonly searchTaskComments?: (
    query: string,
    limit: number
  ) => Promise<GlobalSearchTaskCommentResult[]>
}

type PublicTasksSearchPayload = Awaited<ReturnType<typeof listPublicTasks>>
type ProjectsSearchPayload = Awaited<ReturnType<typeof listProjects>>

export function searchSource(input: {
  source: GlobalSearchSourceName
  query: string
  timeoutMs: number
  execCtx: HttpActionContext
  dependencies: GlobalSearchSourceDependencies
}) {
  const searchTalentsFn = input.dependencies.searchTalents ?? searchTalents
  const listPublicTasksFn = input.dependencies.listPublicTasks ?? listPublicTasks
  const listProjectsFn = input.dependencies.listProjects ?? listProjects
  const listActiveSkillsCatalogFn =
    input.dependencies.listActiveSkillsCatalog ?? listActiveSkillsCatalog
  const searchOrganizationsBasicListFn =
    input.dependencies.searchOrganizationsBasicList ?? searchOrganizationsBasicList
  const searchTaskCommentsFn = input.dependencies.searchTaskComments ?? searchTaskComments
  const emptyTasksPayload: PublicTasksSearchPayload = {
    data: [],
    meta: {
      total: 0,
      per_page: SEARCH_SOURCE_RESULT_LIMIT,
      current_page: 1,
      last_page: 1,
    },
  }
  const emptyProjectsPayload: ProjectsSearchPayload = {
    data: [],
    pagination: {
      page: 1,
      limit: SEARCH_SOURCE_RESULT_LIMIT,
      total: 0,
      totalPages: 1,
    },
    filters: {
      search: input.query,
      limit: SEARCH_SOURCE_RESULT_LIMIT,
    },
    stats: {
      total_projects: 0,
      active_projects: 0,
      completed_projects: 0,
    },
  }

  switch (input.source) {
    case 'talents':
      return settleSearchSource(
        'talents',
        () =>
          searchTalentsFn({ q: input.query, per_page: SEARCH_SOURCE_RESULT_LIMIT }, input.execCtx),
        [] as TalentSearchResult[],
        (items) => items.length,
        input.timeoutMs
      )
    case 'tasks':
      return settleSearchSource(
        'tasks',
        () =>
          listPublicTasksFn(
            { keyword: input.query, per_page: SEARCH_SOURCE_RESULT_LIMIT },
            input.execCtx
          ),
        emptyTasksPayload,
        (items) => items.data.length,
        input.timeoutMs
      )
    case 'projects':
      return settleSearchSource(
        'projects',
        () =>
          listProjectsFn({ search: input.query, limit: SEARCH_SOURCE_RESULT_LIMIT }, input.execCtx),
        emptyProjectsPayload,
        (items) => items.data.length,
        input.timeoutMs
      )
    case 'skills':
      return settleSearchSource(
        'skills',
        () => listActiveSkillsCatalogFn({ q: input.query, limit: SEARCH_SOURCE_RESULT_LIMIT }),
        [] as ActiveSkillCatalogItem[],
        (items) => items.length,
        input.timeoutMs
      )
    case 'organizations':
      return settleSearchSource(
        'organizations',
        () => searchOrganizationsBasicListFn(input.query, SEARCH_SOURCE_RESULT_LIMIT),
        [] as OrganizationDirectoryItem[],
        (items) => items.length,
        input.timeoutMs
      )
    case 'comments':
      return settleSearchSource(
        'comments',
        () => searchTaskCommentsFn(input.query, SEARCH_SOURCE_RESULT_LIMIT),
        [] as GlobalSearchTaskCommentResult[],
        (items) => items.length,
        input.timeoutMs
      )
  }
}
