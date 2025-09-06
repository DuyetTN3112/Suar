export interface ReassignOrUnassignTasksForRemovedMemberV1 {
  commandType: 'tasks.reassign_or_unassign_for_removed_member.v1'
  projectId: string
  removedUserId: string
  fallbackAssigneeUserId: string | null
  requestedByUserId: string
  requestedAt: string
}
