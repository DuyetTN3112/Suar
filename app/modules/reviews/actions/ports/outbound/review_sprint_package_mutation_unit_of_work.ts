import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface ReviewSprintPackageMutationSprint {
  id: string
  organizationId: string
  projectId: string
  name: string
  status: string
  startsAt: string | Date
  endsAt: string | Date
}

export interface ReviewSprintPackageMutationProject {
  ownerId: string | null
  managerId: string | null
}

export interface ReviewSprintPackageRecord {
  id: string
  sprintId: string
  reviewerId: string
  status: string
}

export interface ReviewSprintPackageReference {
  id: string
  reviewerId: string
}

export interface ReviewSprintManagerTargetEvidence {
  userId: string
  assignedTaskCount: number
  createdTaskCount: number
}

export interface ReviewSprintPackageWrite {
  id: string
  sprintId: string
  reviewerId: string
  createdAt: Date
}

export interface ReviewSprintReverseWorkflowTarget {
  reviewerId: string
  targetType: string
  targetUserId: string | null
  targetEntityId: string | null
}

export interface ReviewSprintAssignerTarget {
  reviewerId: string
  targetUserId: string
}

export interface ReviewSprintReverseWorkflowWrite {
  id: string
  sprintId: string
  projectId: string
  organizationId: string
  reviewerId: string
  targetType: 'assigner' | 'environment'
  targetUserId: string | null
  targetEntityId: string | null
  responderId: string | null
  packageId: string | null
  createdAt: Date
}

export interface ReviewNextSprintWrite {
  id: string
  organizationId: string
  projectId: string
  name: string
  startsAt: Date
  endsAt: Date
  createdBy: string
  createdAt: Date
}

export interface ReviewSprintManagerReviewWrite {
  id: string
  packageId: string
  targetUserId: string
  targetRole: string
  rating: number
  dimensions: Record<string, unknown> | null
  comment: string | null
  isAnonymousToTarget: boolean
  createdAt: Date
}

export interface ReviewSprintEnvironmentReviewWrite {
  id: string
  packageId: string
  targetType: string
  targetId: string
  rating: number
  dimensions: Record<string, unknown> | null
  comment: string | null
  isAnonymousPublicly: boolean
  createdAt: Date
}

export interface ReviewSprintPackageNotificationWrite {
  eventName: string
  businessEventId: string
  type: string
  organizationId: string
  actorId: string
  subjectType: string
  subjectId: string
  parameters: Record<string, unknown>
  occurredAt: string
  correlationId?: string
  recipientIds: readonly string[]
  now: Date
}

export interface ReviewSprintPackageAuditWrite {
  action: string
  entityType: string
  entityId: string
  newValues: Record<string, unknown>
}

export interface ReviewSprintPackageMutationPersistenceSession {
  loadSprintForUpdate(
    sprintId: string,
    projectId?: string
  ): Promise<ReviewSprintPackageMutationSprint | null>
  loadSprint(sprintId: string): Promise<ReviewSprintPackageMutationSprint | null>
  loadProject(projectId: string): Promise<ReviewSprintPackageMutationProject | null>
  loadPackageForUpdate(packageId: string): Promise<ReviewSprintPackageRecord | null>
  findActorProjectRole(projectId: string, actorId: string): Promise<string | null>
  findPreviousSprintId(
    projectId: string,
    endingBeforeOrAt: string | Date,
    excludingSprintId: string
  ): Promise<string | null>
  countPendingReverseReviewWorkflows(sprintId: string): Promise<number>
  countPendingTaskReviews(sprintId: string): Promise<number>
  findEligibleReviewerIds(projectId: string, sprintId: string): Promise<string[]>
  markReviewOpen(sprintId: string, actorId: string, openedAt: Date): Promise<void>
  listPackages(
    sprintId: string,
    reviewerIds: readonly string[]
  ): Promise<ReviewSprintPackageReference[]>
  createReviewPackages(rows: readonly ReviewSprintPackageWrite[]): Promise<void>
  listExistingReverseWorkflowTargets(sprintId: string): Promise<ReviewSprintReverseWorkflowTarget[]>
  findAssignerTargets(projectId: string, sprintId: string): Promise<ReviewSprintAssignerTarget[]>
  loadOrganizationOwnerId(organizationId: string): Promise<string | null>
  findApprovedOrganizationAdminId(organizationId: string): Promise<string | null>
  createReverseReviewWorkflows(rows: readonly ReviewSprintReverseWorkflowWrite[]): Promise<void>
  createNextSprint(input: ReviewNextSprintWrite): Promise<void>
  findManagerTargetEvidence(projectId: string): Promise<ReviewSprintManagerTargetEvidence[]>
  createManagerReviews(rows: readonly ReviewSprintManagerReviewWrite[]): Promise<void>
  createEnvironmentReviews(rows: readonly ReviewSprintEnvironmentReviewWrite[]): Promise<void>
  markPackageSubmitted(packageId: string, submittedAt: Date): Promise<void>
  writeAudit(execCtx: ReviewActionContext, input: ReviewSprintPackageAuditWrite): Promise<void>
  stageNotification(input: ReviewSprintPackageNotificationWrite): Promise<void>
}

/**
 * Transactional persistence boundary shared by opening a sprint review and
 * submitting one of its review packages.
 *
 * Commands own authorization, lifecycle policy, target selection, deduping,
 * generated identifiers, and result composition. The adapter owns Lucid/SQL,
 * locking, audit/outbox staging, and commit/rollback.
 */
export interface ReviewSprintPackageMutationUnitOfWork {
  run<T>(work: (session: ReviewSprintPackageMutationPersistenceSession) => Promise<T>): Promise<T>
}
