import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import {
  type TaskResolvedBriefAudience,
} from '#modules/tasks/actions/queries/task-reading/internal/task_resolved_brief_projection'
import { buildTaskPermissionContext } from '#modules/tasks/actions/task_permission_context'
import { canApplyForTask, canProcessApplication } from '#modules/tasks/domain/task-assignment/task_assignment_rules'
import {
  calculateTaskPermissions,
  canViewTask,
  canViewTaskOnMarketplace,
} from '#modules/tasks/domain/task-assignment/task_permission_policy'
import { resolveTaskResolvedBriefAudience } from '#modules/tasks/domain/task-authoring/task_resolved_brief_access_policy'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'

export interface TaskDetailPermissions {
  isCreator: boolean
  isAssignee: boolean
  canEdit: boolean
  canDelete: boolean
  canAssign: boolean
  canChangeStatus: boolean
  canComment: boolean
  canApply: boolean
  canReviewApplications: boolean
}

export interface TaskResolvedBriefAssignmentAccess {
  readonly id: string
  readonly assigneeId: string
  readonly status: 'active' | 'completed'
}

export interface TaskDetailAuthorization {
  permissions: TaskDetailPermissions
  resolvedBriefAudience: TaskResolvedBriefAudience
  resolvedBriefAssignmentAccess: TaskResolvedBriefAssignmentAccess | null
}

export function isApplicationDeadlinePassed(deadline: string | null | undefined): boolean {
  return typeof deadline === 'string' && new Date(deadline).getTime() <= Date.now()
}

export function canOpenTaskWorkArea(permissions: TaskDetailPermissions): boolean {
  return (
    permissions.isCreator ||
    permissions.isAssignee ||
    permissions.canEdit ||
    permissions.canAssign ||
    permissions.canChangeStatus
  )
}

export async function resolveTaskDetailAuthorization(
  userId: string,
  task: TaskDetailRecord,
  surface: 'project' | 'marketplace',
  deps: TaskExternalDependencies
): Promise<TaskDetailAuthorization> {
  const permissionContext = await buildTaskPermissionContext(
    userId,
    task,
    undefined,
    deps.permission,
    deps.activeAssignmentReader
  )
  const isApprovedOrganizationMember =
    surface === 'marketplace'
      ? await deps.org.isApprovedMember(userId, task.organization_id)
      : false

  if (surface === 'marketplace') {
    enforcePolicy(
      canViewTaskOnMarketplace({
        ...permissionContext,
        isApprovedOrganizationMember,
        projectVisibility: task.project?.visibility ?? null,
        allowExternalContributors: task.project?.allow_external_contributors ?? null,
      })
    )
  } else {
    enforcePolicy(canViewTask(permissionContext))
  }

  const [existingApplication, resolvedBriefAssignmentAccess] = await Promise.all([
    deps.lifecycle.findExistingApplication(task.id, userId),
    deps.activeAssignmentReader?.findActorAssignment(task.id, userId) ?? Promise.resolve(null),
  ])

  const taskPermissions = calculateTaskPermissions(permissionContext)
  const canReviewApplications = canProcessApplication({
    actorId: userId,
    taskCreatorId: task.creator_id,
    action: 'reject',
    isTaskAlreadyAssigned: task.assigned_to !== null,
    isProjectOwnerOrManager:
      permissionContext.actorProjectRole === 'project_owner' ||
      permissionContext.actorProjectRole === 'project_manager',
    isOrganizationOwnerOrAdmin:
      permissionContext.actorOrgRole === 'org_owner' ||
      permissionContext.actorOrgRole === 'org_admin',
  }).allowed

  const policyAudience = resolveTaskResolvedBriefAudience(permissionContext)
  const resolvedBriefAudience =
    policyAudience === 'creator_edit'
      ? 'creator_edit'
      : policyAudience === 'work_participant' &&
          resolvedBriefAssignmentAccess?.assigneeId === userId
        ? 'work_participant'
        : policyAudience === 'project_member'
          ? 'project_member'
          : 'public_preview'

  return {
    permissions: {
      ...taskPermissions,
      ...(surface === 'marketplace'
        ? {
            canEdit: false,
            canDelete: false,
            canAssign: false,
            canChangeStatus: false,
            canComment: false,
          }
        : {}),
      canApply:
        !canReviewApplications &&
        canApplyForTask({
          actorId: userId,
          taskCreatorId: task.creator_id,
          taskVisibility: task.task_visibility ?? '',
          isOrganizationMember: Boolean(permissionContext.actorOrgRole),
          isPublicProject: task.project?.visibility === 'public',
          allowsExternalContributors: task.project?.allow_external_contributors === true,
          isTaskAlreadyAssigned: task.assigned_to !== null,
          isApplicationDeadlinePassed: isApplicationDeadlinePassed(task.application_deadline),
          hasExistingApplication: !!existingApplication,
        }).allowed,
      canReviewApplications,
    },
    resolvedBriefAudience,
    resolvedBriefAssignmentAccess,
  }
}
