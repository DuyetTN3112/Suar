import { SEARCH_SOURCE_RESULT_LIMIT, settleSearchSource } from './source_runner.js'

import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type {
  OrganizationDirectoryCapability,
  OrganizationDirectoryItem,
} from '#modules/organizations/public_contracts/directory/organization_directory'
import type { ProjectListingCapability } from '#modules/projects/public_contracts/project_listing'
import type { SearchPublicTaskListing } from '#modules/search/actions/ports/outbound/search_public_task_listing'
import type { SearchTaskCommentReader } from '#modules/search/actions/ports/outbound/search_task_comment_reader'
import type {
  GlobalSearchSourceName,
  GlobalSearchTaskCommentResult,
} from '#modules/search/public_contracts/global_search_contract'
import type {
  ActiveSkillCatalogItem,
  ListActiveSkillsCatalogInput,
} from '#modules/skills/public_contracts/active_skill_catalog'
import type {
  TalentSearchCapability,
  TalentSearchResult,
} from '#modules/users/public_contracts/talent_search'

export interface GlobalSearchSourceDependencies {
  readonly searchTalents?: TalentSearchCapability['search']
  readonly listPublicTasks?: SearchPublicTaskListing
  readonly listProjects?: ProjectListingCapability['list']
  readonly listActiveSkillsCatalog?: (
    input?: ListActiveSkillsCatalogInput
  ) => Promise<ActiveSkillCatalogItem[]>
  readonly searchOrganizationsBasicList?: OrganizationDirectoryCapability['searchBasicList']
  readonly searchTaskComments?: SearchTaskCommentReader['search']
}

type PublicTasksSearchPayload = Awaited<ReturnType<SearchPublicTaskListing>>
type ProjectsSearchPayload = Awaited<ReturnType<ProjectListingCapability['list']>>

export function searchSource(input: {
  source: GlobalSearchSourceName
  query: string
  timeoutMs: number
  execCtx: HttpActionContext
  dependencies: GlobalSearchSourceDependencies
}) {
  const searchTalentsFn =
    input.dependencies.searchTalents ??
    (() => Promise.reject(new Error('Global search talents source is not composed')))
  const listPublicTasksFn =
    input.dependencies.listPublicTasks ??
    (() => Promise.reject(new Error('Global search tasks source is not composed')))
  const listProjectsFn =
    input.dependencies.listProjects ??
    (() => Promise.reject(new Error('Global search projects source is not composed')))
  const listActiveSkillsCatalogFn =
    input.dependencies.listActiveSkillsCatalog ??
    (() => Promise.reject(new Error('Global search skills source is not composed')))
  const searchOrganizationsBasicListFn =
    input.dependencies.searchOrganizationsBasicList ??
    (() => Promise.reject(new Error('Global search organizations source is not composed')))
  const searchTaskCommentsFn =
    input.dependencies.searchTaskComments ??
    (() => Promise.reject(new Error('Global search comments source is not composed')))
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
        (signal) =>
          searchTalentsFn(
            { q: input.query, per_page: SEARCH_SOURCE_RESULT_LIMIT },
            input.execCtx,
            signal
          ),
        [] as TalentSearchResult[],
        (items) => items.length,
        input.timeoutMs
      )
    case 'tasks':
      return settleSearchSource(
        'tasks',
        (_signal) =>
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
        (_signal) =>
          listProjectsFn({ search: input.query, limit: SEARCH_SOURCE_RESULT_LIMIT }, input.execCtx),
        emptyProjectsPayload,
        (items) => items.data.length,
        input.timeoutMs
      )
    case 'skills':
      return settleSearchSource(
        'skills',
        (_signal) =>
          listActiveSkillsCatalogFn({ q: input.query, limit: SEARCH_SOURCE_RESULT_LIMIT }),
        [] as ActiveSkillCatalogItem[],
        (items) => items.length,
        input.timeoutMs
      )
    case 'organizations':
      return settleSearchSource(
        'organizations',
        (_signal) => searchOrganizationsBasicListFn(input.query, SEARCH_SOURCE_RESULT_LIMIT),
        [] as OrganizationDirectoryItem[],
        (items) => items.length,
        input.timeoutMs
      )
    case 'comments':
      return settleSearchSource(
        'comments',
        (_signal) => searchTaskCommentsFn(input.query, SEARCH_SOURCE_RESULT_LIMIT),
        [] as GlobalSearchTaskCommentResult[],
        (items) => items.length,
        input.timeoutMs
      )
  }
}
