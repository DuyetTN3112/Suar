import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface ReviewSprintLifecycleSprint {
  id: string
  projectId: string
  status: string
}

export interface ReviewSprintLifecycleProject {
  ownerId: string | null
  managerId: string | null
}

export interface ReviewSprintPackageCounts {
  pending: number
  submitted: number
}

export interface ReviewSprintLifecycleAuditWrite {
  action: string
  entityId: string
  newValues: Record<string, unknown>
}

export interface ReviewSprintLifecyclePersistenceSession {
  loadSprintForUpdate(sprintId: string): Promise<ReviewSprintLifecycleSprint | null>
  loadProject(projectId: string): Promise<ReviewSprintLifecycleProject | null>
  findActorProjectRole(projectId: string, actorId: string): Promise<string | null>
  countPackages(sprintId: string): Promise<ReviewSprintPackageCounts>
  countPendingReverseReviewWorkflows(sprintId: string): Promise<number>
  markReviewClosed(sprintId: string, closedAt: Date): Promise<void>
  recalculateTargetStats(sprintId: string): Promise<void>
  expirePendingPackages(sprintId: string): Promise<number>
  writeAudit(execCtx: ReviewActionContext, input: ReviewSprintLifecycleAuditWrite): Promise<void>
}

/**
 * Transactional persistence boundary for sprint review lifecycle mutations.
 *
 * Commands retain authorization, transition policy, gate ordering, and result
 * semantics. Infrastructure owns locking, SQL, transaction scope, audit
 * persistence, and reverse-review statistics persistence.
 */
export interface ReviewSprintLifecycleUnitOfWork {
  run<T>(work: (session: ReviewSprintLifecyclePersistenceSession) => Promise<T>): Promise<T>
}
