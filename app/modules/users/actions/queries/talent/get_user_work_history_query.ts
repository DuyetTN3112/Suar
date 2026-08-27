import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  entityCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import {
  definePaginationPolicy,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { BaseQuery } from '#modules/users/actions/base_query'
import type { LegacyAccomplishmentCutoverDecision } from '#modules/users/actions/ports/inbound/legacy_accomplishment_cutover_decision'
import type { LegacyAccomplishmentReadComparisonObserver } from '#modules/users/actions/ports/outbound/legacy_accomplishment_read_comparison_observer'
import type {
  UserAdminApprovedAiDemonstratedWorkSource,
  UserDemonstratedWorkSource,
  UserVerifiedDemonstratedWorkSource,
  UserWorkHistoryReader,
} from '#modules/users/actions/ports/outbound/user_work_history_reader'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

export interface OrgMembershipItem {
  org_name: string
  org_role: string
  joined_at: string
  status: string
}

export interface ProjectMembershipItem {
  project_name: string
  org_name: string | null
  project_role: string
  start_date: string | null
  end_date: string | null
  visibility: string
}

export interface WorkHistoryResult {
  organizations: OrgMembershipItem[]
  projects: ProjectMembershipItem[]
  demonstratedWork: DemonstratedWorkItem[]
  demonstratedWorkPagination?: {
    page: number
    perPage: number
    hasPreviousPage: boolean
    hasMore: boolean
  }
}

export interface DemonstratedWorkItem {
  taskAssignmentId?: string
  taskId?: string
  action: string | null
  object: string
  statement: string | null
  ownership: string | null
  context: {
    businessDomain: string | null
    problemCategory: string | null
    collaborationType: string | null
    environment: string | null
    scaleSummary: string | null
  }
  output: {
    title: string
    difficulty: string | null
  }
  outcome: {
    onTime: boolean | null
    qualityScore: number | null
  }
  verification: {
    status: 'review_confirmed' | 'admin_confirmed' | 'retrospective'
    confidence: 'high' | 'limited'
    method: string | null
    evidenceSufficiency:
      | 'pending'
      | 'adequate'
      | 'governed_exception'
      | 'inadequate'
      | null
  }
  capabilities?: Array<{
    name: string
    observedLevel: string
    declaredMinimumLevel?: string | null
    assessedTaskDifficultyLevel?: string | null
  }>
  completedAt: string | null
}

export class GetUserWorkHistoryDTO {
  declare user_id: string
  declare work: GetUserWorkHistoryOptions

  constructor(userId: string, work: GetUserWorkHistoryOptions = {}) {
    this.user_id = userId
    this.work = work
  }
}

export interface GetUserWorkHistoryOptions {
  page?: unknown
  perPage?: unknown
  sort?: 'completed_asc' | 'completed_desc'
  verification?: 'review_confirmed' | 'admin_confirmed' | 'retrospective'
  action?: string
  ownership?: string
}

function formatDate(value: Date | string | null): string | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('vi-VN', { year: 'numeric', month: 'short' })
}

function mapDemonstratedWork(row: UserDemonstratedWorkSource): DemonstratedWorkItem {
  // `user_work_history` is a compatibility/read-model table. A quality score
  // proves that a score was materialized, not that a governed review finalized
  // an accomplishment. Until this query consumes an authoritative verified
  // accomplishment projection, classify the row conservatively.
  return {
    taskAssignmentId: row.task_assignment_id,
    taskId: row.task_id,
    action: row.task_type,
    object: row.task_title,
    statement: null,
    ownership: row.role_in_task,
    context: {
      businessDomain: row.business_domain,
      problemCategory: row.problem_category,
      collaborationType: row.collaboration_type,
      environment: null,
      scaleSummary: null,
    },
    output: {
      title: row.task_title,
      difficulty: row.difficulty,
    },
    outcome: {
      onTime: row.was_on_time,
      qualityScore: row.overall_quality_score,
    },
    verification: {
      status: 'retrospective',
      confidence: 'limited',
      method: null,
      evidenceSufficiency: null,
    },
    completedAt: formatDate(row.completed_at),
  }
}

function mapVerifiedDemonstratedWork(
  row: UserVerifiedDemonstratedWorkSource
): DemonstratedWorkItem {
  return {
    taskAssignmentId: row.task_assignment_id,
    taskId: row.task_id,
    action: row.action,
    object: row.object,
    statement: row.concise_statement,
    ownership: row.ownership_level,
    context: {
      businessDomain: row.business_domain,
      problemCategory: row.problem_category,
      collaborationType: row.collaboration_type,
      environment: row.environment,
      scaleSummary: row.scale_summary,
    },
    output: {
      title: row.title,
      difficulty: null,
    },
    outcome: {
      onTime: null,
      qualityScore: null,
    },
    verification: {
      status: 'review_confirmed',
      confidence: row.confidence_band === 'high' ? 'high' : 'limited',
      method: row.verification_method,
      evidenceSufficiency: row.evidence_sufficiency,
    },
    completedAt: formatDate(row.verified_at),
  }
}

function mapAdminApprovedAiDemonstratedWork(
  row: UserAdminApprovedAiDemonstratedWorkSource
): DemonstratedWorkItem {
  return {
    taskAssignmentId: row.task_assignment_id,
    taskId: row.task_id,
    action: row.action,
    object: row.object,
    statement: row.concise_statement,
    ownership: row.ownership_level,
    context: {
      businessDomain: null,
      problemCategory: null,
      collaborationType: null,
      environment: null,
      scaleSummary: row.context_summary,
    },
    output: {
      title: row.title,
      difficulty: null,
    },
    outcome: {
      onTime: null,
      qualityScore: null,
    },
    verification: {
      status: 'admin_confirmed',
      confidence: 'limited',
      method: 'Phân tích AI đã được quản trị viên hệ thống phê duyệt',
      evidenceSufficiency: 'governed_exception',
    },
    capabilities: row.capability_proposals.map((proposal) => ({
      name: proposal.capability_name,
      observedLevel: proposal.approved_observed_level,
      declaredMinimumLevel: proposal.declared_minimum_level ?? null,
      assessedTaskDifficultyLevel: proposal.assessed_task_difficulty_level ?? null,
    })),
    completedAt: formatDate(row.approved_at),
  }
}

function isEligibleVerifiedWork(
  row: UserVerifiedDemonstratedWorkSource,
  viewerScope: 'self' | 'public'
): boolean {
  if (!['verified', 'partially_verified'].includes(row.lifecycle_state ?? 'verified')) {
    return false
  }
  return viewerScope === 'self' || (row.visibility ?? 'public') === 'public'
}

export default class GetUserWorkHistoryQuery extends BaseQuery<
  GetUserWorkHistoryDTO,
  WorkHistoryResult
> {
  constructor(
    execCtx: UserActionContext,
    private readonly dependencies: UserWorkHistoryReader,
    private readonly comparisonObserver?: LegacyAccomplishmentReadComparisonObserver,
    private readonly cutoverDecision: LegacyAccomplishmentCutoverDecision = {
      allowLegacyRead: true,
      allowNewRead: true,
      allowNewWrite: true,
    }
  ) {
    super(execCtx)
  }

  async handle(dto: GetUserWorkHistoryDTO): Promise<WorkHistoryResult> {
    const viewerScope = this.execCtx.userId === dto.user_id ? 'self' : 'public'
    const hasWorkOptions = Object.keys(dto.work).length > 0
    const pagination = normalizePagination(dto.work, definePaginationPolicy(), { perPage: 10 })
    const logicalCacheKey = hasWorkOptions
      ? `users:work_history:${dto.user_id}:${viewerScope}:work:${pagination.page}:${pagination.perPage}:${dto.work.sort ?? 'completed_desc'}:${dto.work.verification ?? ''}:${dto.work.action ?? ''}:${dto.work.ownership ?? ''}`
      : `users:work_history:${dto.user_id}:${viewerScope}`

    const resolveHistory = async () => {
      const [
        orgRows,
        projectRows,
        demonstratedWorkRowsRaw,
        verifiedWorkRowsRaw,
        adminApprovedAiWorkRowsRaw,
      ] = await Promise.all([
        this.dependencies.listOrganizationMemberships(dto.user_id),
        this.dependencies.listProjectMemberships(dto.user_id, viewerScope),
        this.cutoverDecision.allowLegacyRead
          ? this.dependencies.listDemonstratedWork(dto.user_id, viewerScope)
          : Promise.resolve([]),
        this.cutoverDecision.allowNewRead
          ? this.dependencies.listVerifiedDemonstratedWork(dto.user_id, viewerScope)
          : Promise.resolve([]),
        this.cutoverDecision.allowNewRead
          ? this.dependencies.listAdminApprovedAiDemonstratedWork(dto.user_id, viewerScope)
          : Promise.resolve([]),
      ])
      const activePublicAccomplishmentIds =
        viewerScope === 'public'
          ? new Set(await this.dependencies.listActivePublicAccomplishmentIds(dto.user_id))
          : null
      const demonstratedWorkRows =
        viewerScope === 'public'
          ? demonstratedWorkRowsRaw.filter((row) => row.is_public !== false)
          : demonstratedWorkRowsRaw
      const verifiedWorkRows = verifiedWorkRowsRaw.filter((row) =>
        isEligibleVerifiedWork(row, viewerScope) &&
        (viewerScope === 'self' || activePublicAccomplishmentIds?.has(row.accomplishment_id) === true)
      )
      const adminApprovedAiWorkRows =
        viewerScope === 'public'
          ? adminApprovedAiWorkRowsRaw.filter((row) => row.is_public === true)
          : adminApprovedAiWorkRowsRaw
      const organizationIds = [
        ...new Set(projectRows.map((row) => row.organization_id).filter(Boolean)),
      ]
      const organizationNames = await this.dependencies.listOrganizationNamesByIds(organizationIds)
      const organizationNameById = new Map(
        organizationNames.map((organization) => [organization.id, organization.name])
      )

      const organizations: OrgMembershipItem[] = orgRows.map((row) => ({
        org_name: row.organization_name,
        org_role: row.org_role,
        joined_at: formatDate(row.joined_at) ?? '',
        status: row.status,
      }))

      const projects: ProjectMembershipItem[] = projectRows.map((row) => ({
        project_name: row.project_name,
        org_name: organizationNameById.get(row.organization_id) ?? null,
        project_role: row.project_role,
        start_date: formatDate(row.start_date),
        end_date: formatDate(row.end_date),
        visibility: row.visibility,
      }))

      const verifiedWork = verifiedWorkRows.map((row) => ({
        item: mapVerifiedDemonstratedWork(row),
        sourceTimestamp: row.verified_at,
      }))
      const verifiedAssignmentIds = new Set(
        verifiedWork.map(({ item }) => item.taskAssignmentId)
      )
      const adminApprovedAiWork = adminApprovedAiWorkRows
        .filter((row) => !verifiedAssignmentIds.has(row.task_assignment_id))
        .map((row) => ({
          item: mapAdminApprovedAiDemonstratedWork(row),
          sourceTimestamp: row.approved_at,
        }))
      const governedAssignmentIds = new Set([
        ...verifiedAssignmentIds,
        ...adminApprovedAiWork.map(({ item }) => item.taskAssignmentId),
      ])
      const legacyWork = demonstratedWorkRows
        .filter((row) => !governedAssignmentIds.has(row.task_assignment_id))
        .map((row) => ({
          item: mapDemonstratedWork(row),
          sourceTimestamp: row.completed_at,
        }))

      const candidates = [
        ...verifiedWork,
        ...adminApprovedAiWork,
        ...legacyWork,
      ]
        .filter(({ item }) => !dto.work.verification || item.verification.status === dto.work.verification)
        .filter(({ item }) => !dto.work.action || item.action === dto.work.action)
        .filter(({ item }) => !dto.work.ownership || item.ownership === dto.work.ownership)

      if (hasWorkOptions) {
        candidates.sort((left, right) => {
          const leftTime = left.sourceTimestamp
            ? new Date(left.sourceTimestamp).getTime()
            : 0
          const rightTime = right.sourceTimestamp
            ? new Date(right.sourceTimestamp).getTime()
            : 0
          const timeOrder = (dto.work.sort ?? 'completed_desc') === 'completed_asc'
            ? leftTime - rightTime
            : rightTime - leftTime
          return timeOrder || (left.item.taskAssignmentId ?? '').localeCompare(right.item.taskAssignmentId ?? '')
        })
      }

      const visibleCandidates = hasWorkOptions
        ? candidates.slice(
            (pagination.page - 1) * pagination.perPage,
            pagination.page * pagination.perPage
          )
        : candidates
      const demonstratedWork = visibleCandidates.map(({ item }) => {
        if (viewerScope === 'self') return item
        const { taskAssignmentId: _assignmentId, taskId: _taskId, ...publicItem } = item
        return publicItem
      })

      if (this.comparisonObserver && this.cutoverDecision.allowLegacyRead && this.cutoverDecision.allowNewRead) {
        const legacyAssignmentIds = new Set(demonstratedWorkRows.map((row) => row.task_assignment_id))
        const overlapCount = [...legacyAssignmentIds].filter((id) => verifiedAssignmentIds.has(id)).length
        this.comparisonObserver.observe({
          userId: dto.user_id,
          viewerScope,
          legacyCandidateCount: legacyAssignmentIds.size,
          verifiedCandidateCount: verifiedAssignmentIds.size,
          overlapCount,
          legacyOnlyCount: legacyAssignmentIds.size - overlapCount,
          verifiedOnlyCount: verifiedAssignmentIds.size - overlapCount,
          mergedCount: verifiedWork.length + legacyWork.length,
        })
      }

      return {
        organizations,
        projects,
        demonstratedWork,
        ...(hasWorkOptions
          ? {
              demonstratedWorkPagination: {
                page: pagination.page,
                perPage: pagination.perPage,
                hasPreviousPage: pagination.page > 1,
                hasMore: pagination.page * pagination.perPage < candidates.length,
              },
            }
          : {}),
      }
    }
    const cacheKey = await this.resolveVersionedCacheKey(
      entityCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.userWorkHistory,
        'user',
        dto.user_id
      ),
      logicalCacheKey
    )
    if (!cacheKey) {
      return resolveHistory()
    }

    return this.executeWithCache(cacheKey, 300, resolveHistory)
  }

  protected resolveVersionedCacheKey(
    namespaces: readonly string[],
    logicalKey: string
  ): Promise<string | null> {
    return cacheStore.resolveVersionedKeyBestEffort(namespaces, logicalKey)
  }
}
