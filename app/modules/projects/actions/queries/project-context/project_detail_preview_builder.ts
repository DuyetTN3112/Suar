import type { ProjectOrganizationSummary } from '../../ports/outbound/project_external_dependencies.js'

import type { ProjectPermissionContext } from '#modules/projects/domain/project-context/project_types'
import { calculateProjectDetailPermissions } from '#modules/projects/domain/project-members/project_permission_policy'
import type { GetProjectDetailResult } from '#modules/projects/public_contracts/project_detail'
import type { ProjectRecord } from '#modules/projects/types/project_records'

export function buildProjectPreviewResult(
  project: ProjectRecord,
  organization: ProjectOrganizationSummary | null,
  permissionContext: ProjectPermissionContext
): GetProjectDetailResult {
  return {
    project_context: null,
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      organization_id: project.organization_id,
      organization_name: organization?.name ?? null,
      creator_id: null,
      creator_name: null,
      manager_id: null,
      manager_name: null,
      owner_id: null,
      owner_name: null,
      start_date: project.start_date,
      end_date: project.end_date,
      status: project.status,
      visibility: project.visibility,
      business_domains: project.business_domains ?? [],
      created_at: project.created_at,
      updated_at: project.updated_at,
    },
    members: [],
    tasks: [],
    tasks_summary: {
      total: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0,
    },
    recent_activity: [],
    permissions: calculateProjectDetailPermissions({
      ...permissionContext,
      projectManagerId: project.manager_id,
    }),
    review_governance: {
      total_sessions: 0,
      pending_sessions: 0,
      overdue_sessions: 0,
      disputed_sessions: 0,
      completed_sessions: 0,
      required_pending_assignments: 0,
      fallback_pending_assignments: 0,
      completion_rate: 0,
    },
    project_reverse_reviews: {
      total_reviews: 0,
      anonymous_reviews: 0,
      average_rating: null,
      recent: [],
    },
  }
}
