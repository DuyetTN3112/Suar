import { TaskOrgRole, TaskProjectRole } from './role_contracts.js'
import type { TaskPermissionContext } from './task_types.js'

export type TaskResolvedBriefAudience =
  | 'creator_edit'
  | 'work_participant'
  | 'project_member'
  | 'public_preview'

/**
 * Authoring provenance belongs only to the creator. The published executable
 * contract is readable by authenticated project participants and organization
 * managers who can already view the task. Assignment snapshots remain reserved
 * for the assigned participant.
 */
export function resolveTaskResolvedBriefAudience(
  context: TaskPermissionContext
): TaskResolvedBriefAudience {
  if (context.actorId === context.taskCreatorId) return 'creator_edit'
  if (context.taskAssignedTo === context.actorId || context.isActiveAssignee) {
    return 'work_participant'
  }

  if (
    context.actorProjectRole === TaskProjectRole.OWNER ||
    context.actorProjectRole === TaskProjectRole.MANAGER ||
    context.actorProjectRole === TaskProjectRole.MEMBER ||
    context.actorProjectRole === TaskProjectRole.VIEWER ||
    context.actorOrgRole === TaskOrgRole.OWNER ||
    context.actorOrgRole === TaskOrgRole.ADMIN
  ) {
    return 'project_member'
  }

  return 'public_preview'
}
