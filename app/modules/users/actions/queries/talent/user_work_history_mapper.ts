import type {
  DemonstratedWorkItem,
  OrgMembershipItem,
  ProjectMembershipItem,
} from './user_work_history_types.js'

import type {
  UserAdminApprovedAiDemonstratedWorkSource,
  UserDemonstratedWorkSource,
  UserVerifiedDemonstratedWorkSource,
} from '#modules/users/actions/ports/outbound/user_work_history_reader'

export function formatDate(value: Date | string | null): string | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('vi-VN', { year: 'numeric', month: 'short' })
}

export function mapDemonstratedWork(row: UserDemonstratedWorkSource): DemonstratedWorkItem {
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

export function mapVerifiedDemonstratedWork(
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

export function mapAdminApprovedAiDemonstratedWork(
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
    capabilities: row.capability_proposals.map((proposal) => {
      const entry: {
        name: string
        observedLevel: string
        declaredMinimumLevel?: string | null
        assessedTaskDifficultyLevel?: string | null
      } = {
        name: proposal.capability_name,
        observedLevel: proposal.approved_observed_level,
      }
      if (proposal.declared_minimum_level !== undefined) {
        entry.declaredMinimumLevel = proposal.declared_minimum_level
      }
      if (proposal.assessed_task_difficulty_level !== undefined) {
        entry.assessedTaskDifficultyLevel = proposal.assessed_task_difficulty_level
      }
      return entry
    }),
    completedAt: formatDate(row.approved_at),
  }
}

export function isEligibleVerifiedWork(
  row: UserVerifiedDemonstratedWorkSource,
  viewerScope: 'self' | 'public'
): boolean {
  if (!['verified', 'partially_verified'].includes(row.lifecycle_state ?? 'verified')) {
    return false
  }
  return viewerScope === 'self' || (row.visibility ?? 'public') === 'public'
}

export function mapOrganizationMemberships(
  rows: Array<{
    organization_name: string
    org_role: string
    joined_at: Date | string | null
    status: string
  }>
): OrgMembershipItem[] {
  return rows.map((row) => ({
    org_name: row.organization_name,
    org_role: row.org_role,
    joined_at: formatDate(row.joined_at) ?? '',
    status: row.status,
  }))
}

export function mapProjectMemberships(
  rows: Array<{
    project_name: string
    organization_id: string
    project_role: string
    start_date: Date | string | null
    end_date: Date | string | null
    visibility: string
  }>,
  organizationNameById: Map<string, string>
): ProjectMembershipItem[] {
  return rows.map((row) => ({
    project_name: row.project_name,
    org_name: organizationNameById.get(row.organization_id) ?? null,
    project_role: row.project_role,
    start_date: formatDate(row.start_date),
    end_date: formatDate(row.end_date),
    visibility: row.visibility,
  }))
}
