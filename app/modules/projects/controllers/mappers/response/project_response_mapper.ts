import type { SerializedModelRecord, SerializableModelRecord } from './model_response_serialization.js'
import { serializeModelCollectionForHttpResponse, serializeModelForHttpResponse } from './model_response_serialization.js'

import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import type { GetProjectDetailResult } from '#modules/projects/actions/queries/get_project_detail_query'

interface ProjectsIndexResult {
  data: unknown[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: unknown
  stats: unknown
}

interface RoleStaffingCandidatesApiResult {
  role: {
    id: string
    name: string
    code: string
  }
  requirements: Array<{
    skill_id: string
    skill_name: string
    minimum_level_id: string | null
    target_level_id: string | null
    assessment_ceiling_level_id: string | null
    is_mandatory: boolean
    importance: string
    weight: number
  }>
  candidates: Array<{
    user_id: string
    username: string
    email: string
    source: 'project_member' | 'org_member' | 'external'
    match_score: number
    matched_skills: number
    total_required_skills: number
    skill_gaps: string[]
    reviewed_skills_count: number
    imported_skills_count: number
    under_dispute_skills_count: number
    latest_confidence_signal: 'low' | 'medium' | 'high' | null
  }>
  project_members: Array<{
    user_id: string
    username: string
    email: string
    source: 'project_member' | 'org_member' | 'external'
    match_score: number
    matched_skills: number
    total_required_skills: number
    skill_gaps: string[]
    reviewed_skills_count: number
    imported_skills_count: number
    under_dispute_skills_count: number
    latest_confidence_signal: 'low' | 'medium' | 'high' | null
  }>
  org_members: Array<{
    user_id: string
    username: string
    email: string
    source: 'project_member' | 'org_member' | 'external'
    match_score: number
    matched_skills: number
    total_required_skills: number
    skill_gaps: string[]
    reviewed_skills_count: number
    imported_skills_count: number
    under_dispute_skills_count: number
    latest_confidence_signal: 'low' | 'medium' | 'high' | null
  }>
}

function mapStaffingCandidate(candidate: RoleStaffingCandidatesApiResult['candidates'][number]) {
  return {
    userId: candidate.user_id,
    username: candidate.username,
    email: candidate.email,
    source: candidate.source,
    matchScore: candidate.match_score,
    matchedSkills: candidate.matched_skills,
    totalRequiredSkills: candidate.total_required_skills,
    skillGaps: candidate.skill_gaps,
    reviewedSkillsCount: candidate.reviewed_skills_count,
    importedSkillsCount: candidate.imported_skills_count,
    underDisputeSkillsCount: candidate.under_dispute_skills_count,
    latestConfidenceSignal: candidate.latest_confidence_signal,
  }
}

export function mapProjectsIndexPageProps(
  result: ProjectsIndexResult,
  showOrganizationRequiredModal: boolean
) {
  return {
    projects: serializeModelCollectionForHttpResponse(
      result.data as (SerializableModelRecord | SerializedModelRecord)[]
    ),
    pagination: toCanonicalPagePagination({
      total: result.pagination.total,
      perPage: result.pagination.limit,
      currentPage: result.pagination.page,
      lastPage: result.pagination.totalPages,
    }),
    filters: result.filters,
    stats: result.stats,
    showOrganizationRequiredModal,
  }
}

export function mapProjectDetailPageProps<T extends object>(result: T): T {
  return result
}

export function mapProjectDetailApiBody(result: GetProjectDetailResult) {
  return {
  }
}

export function mapDeleteProjectApiBody(message: string) {
  return {
    success: true,
    message,
  }
}

export function mapOrganizationProjectsPageProps<T extends object>(result: T): T {
  return result
}

interface ProjectDetailPageOptions {
  shellMode?: 'app' | 'organization'
  baseRoute?: string
}

export function mapScopedProjectDetailPageProps<T extends object>(
  result: T,
  options?: ProjectDetailPageOptions
): T & {
  shellMode: 'app' | 'organization'
  baseRoute: string
} {
  return {
    ...result,
    shellMode: options?.shellMode ?? 'app',
    baseRoute: options?.baseRoute ?? '/projects',
  }
}
