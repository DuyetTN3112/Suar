import { buildSearchCenterResults, emptySearchResultTotalsByType } from './result_builder.js'
import {
  MAX_SEARCH_CENTER_RESULTS,
  SEARCH_SOURCE_RESULT_LIMIT,
  readSourceValue,
} from './source_runner.js'
import type {
  GlobalSearchCenterResult,
  GlobalSearchResult,
  GlobalSearchSourceName,
  GlobalSearchSourceStatus,
  GlobalSearchTaskCommentResult,
} from './types.js'

import type { OrganizationDirectoryItem } from '#modules/organizations/public_contracts/organization_directory'
import { type GetProjectsListResult } from '#modules/projects/public_contracts/project_listing'
import type { ActiveSkillCatalogItem } from '#modules/skills/public_contracts/active_skill_catalog'
import { type PublicTaskListingResult } from '#modules/tasks/public_contracts/public_task_listing'
import type { TalentSearchResult } from '#modules/users/public_contracts/talent_search'


type PublicTasksSearchPayload = { data: PublicTaskListingResult['data'] }
type ProjectsSearchPayload = { data: GetProjectsListResult['data'] }

export function buildGlobalSearchResultFromSources(
  query: string,
  sourceValues: Map<GlobalSearchSourceName, unknown>,
  sourceStatuses: GlobalSearchSourceStatus[]
): GlobalSearchResult {
  const grouped = buildGroupedSourceResults(query, sourceValues, sourceStatuses)
  const rankedResults = buildSearchCenterResults(grouped, query)

  return {
    ...grouped,
    results: rankedResults.results,
    candidateResultCount: rankedResults.candidateResultCount,
    candidateTotalByType: rankedResults.candidateTotalByType,
    candidateFieldFacets: rankedResults.candidateFieldFacets,
    resultLimit: rankedResults.resultLimit,
    resultsTruncated: rankedResults.resultsTruncated,
  }
}

export function emptyGlobalSearchResult(query: string): GlobalSearchResult {
  return {
    query,
    talents: [],
    tasks: [],
    projects: [],
    skills: [],
    organizations: [],
    comments: [],
    results: [],
    candidateResultCount: 0,
    candidateTotalByType: emptySearchResultTotalsByType(),
    candidateFieldFacets: [],
    resultLimit: MAX_SEARCH_CENTER_RESULTS,
    resultsTruncated: false,
    sourceStatuses: [],
  }
}

function buildGroupedSourceResults(
  query: string,
  sourceValues: Map<GlobalSearchSourceName, unknown>,
  sourceStatuses: GlobalSearchSourceStatus[]
): GlobalSearchResult {
  const emptyTasksPayload: PublicTasksSearchPayload = {
    data: [],
  }
  const emptyProjectsPayload: ProjectsSearchPayload = {
    data: [],
  }

  return {
    ...emptyGlobalSearchResult(query),
    talents: readSourceValue<TalentSearchResult[]>(sourceValues, 'talents', []).slice(
      0,
      SEARCH_SOURCE_RESULT_LIMIT
    ),
    tasks: readSourceValue<PublicTasksSearchPayload>(
      sourceValues,
      'tasks',
      emptyTasksPayload
    ).data.slice(0, SEARCH_SOURCE_RESULT_LIMIT),
    projects: readSourceValue<ProjectsSearchPayload>(
      sourceValues,
      'projects',
      emptyProjectsPayload
    ).data.slice(0, SEARCH_SOURCE_RESULT_LIMIT),
    skills: readSourceValue<ActiveSkillCatalogItem[]>(sourceValues, 'skills', []).slice(
      0,
      SEARCH_SOURCE_RESULT_LIMIT
    ),
    organizations: readSourceValue<OrganizationDirectoryItem[]>(
      sourceValues,
      'organizations',
      []
    ).slice(0, SEARCH_SOURCE_RESULT_LIMIT),
    comments: readSourceValue<GlobalSearchTaskCommentResult[]>(sourceValues, 'comments', []).slice(
      0,
      SEARCH_SOURCE_RESULT_LIMIT
    ),
    results: [] as GlobalSearchCenterResult[],
    sourceStatuses,
  }
}
