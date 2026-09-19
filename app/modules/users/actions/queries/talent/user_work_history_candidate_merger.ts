import {
  mapAdminApprovedAiDemonstratedWork,
  mapDemonstratedWork,
  mapVerifiedDemonstratedWork,
} from './user_work_history_mapper.js'
import type {
  DemonstratedWorkItem,
  GetUserWorkHistoryOptions,
} from './user_work_history_types.js'

import type { LegacyAccomplishmentCutoverDecision } from '#modules/users/actions/ports/inbound/legacy_accomplishment_cutover_decision'
import type { LegacyAccomplishmentReadComparisonObserver } from '#modules/users/actions/ports/outbound/legacy_accomplishment_read_comparison_observer'
import type {
  UserAdminApprovedAiDemonstratedWorkSource,
  UserDemonstratedWorkSource,
  UserVerifiedDemonstratedWorkSource,
} from '#modules/users/actions/ports/outbound/user_work_history_reader'


export interface WorkCandidate {
  item: DemonstratedWorkItem
  sourceTimestamp: Date | string | null
}

export interface MergeCandidatesInput {
  userId: string
  viewerScope: 'self' | 'public'
  demonstratedWorkRows: UserDemonstratedWorkSource[]
  verifiedWorkRows: UserVerifiedDemonstratedWorkSource[]
  adminApprovedAiWorkRows: UserAdminApprovedAiDemonstratedWorkSource[]
  workOptions: GetUserWorkHistoryOptions
  pagination: { page: number; perPage: number }
  comparisonObserver?: LegacyAccomplishmentReadComparisonObserver
  cutoverDecision: LegacyAccomplishmentCutoverDecision
}

export interface MergedCandidatesResult {
  demonstratedWork: DemonstratedWorkItem[]
  paginationMeta?: {
    page: number
    perPage: number
    hasPreviousPage: boolean
    hasMore: boolean
  }
}

export function mergeAndProjectWorkCandidates(
  input: MergeCandidatesInput
): MergedCandidatesResult {
  const {
    userId,
    viewerScope,
    demonstratedWorkRows,
    verifiedWorkRows,
    adminApprovedAiWorkRows,
    workOptions,
    pagination,
    comparisonObserver,
    cutoverDecision,
  } = input

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
    .filter(({ item }) => !workOptions.verification || item.verification.status === workOptions.verification)
    .filter(({ item }) => !workOptions.action || item.action === workOptions.action)
    .filter(({ item }) => !workOptions.ownership || item.ownership === workOptions.ownership)

  const hasWorkOptions = Object.keys(workOptions).length > 0

  if (hasWorkOptions) {
    candidates.sort((left, right) => {
      const leftTime = left.sourceTimestamp
        ? new Date(left.sourceTimestamp).getTime()
        : 0
      const rightTime = right.sourceTimestamp
        ? new Date(right.sourceTimestamp).getTime()
        : 0
      const timeOrder = (workOptions.sort ?? 'completed_desc') === 'completed_asc'
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

  if (comparisonObserver && cutoverDecision.allowLegacyRead && cutoverDecision.allowNewRead) {
    const legacyAssignmentIds = new Set(demonstratedWorkRows.map((row) => row.task_assignment_id))
    const overlapCount = [...legacyAssignmentIds].filter((id) => verifiedAssignmentIds.has(id)).length
    comparisonObserver.observe({
      userId,
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
    demonstratedWork,
    ...(hasWorkOptions
      ? {
          paginationMeta: {
            page: pagination.page,
            perPage: pagination.perPage,
            hasPreviousPage: pagination.page > 1,
            hasMore: pagination.page * pagination.perPage < candidates.length,
          },
        }
      : {}),
  }
}
