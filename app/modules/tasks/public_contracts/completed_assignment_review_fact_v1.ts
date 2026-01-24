/**
 * Tasks-owned stable fact used to start a review workflow for a completed assignment.
 *
 * Consumers receive only scalar facts and must not depend on Tasks persistence models.
 */
export interface CompletedAssignmentReviewFactV1 {
  contractVersion: 1
  id: string
  taskId: string
  assigneeId: string
  taskCreatorId: string
}
