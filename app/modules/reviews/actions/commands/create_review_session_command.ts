import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import type { CreateReviewSessionDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import type { ReviewCompletedAssignmentReader } from '#modules/reviews/actions/ports/outbound/review_completed_assignment_reader'
import type { ReviewSessionCreationUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_session_creation_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { REVIEW_DEFAULTS } from '#modules/reviews/public_contracts/review_constants'
import type { ReviewSessionRecord } from '#modules/reviews/types/review_records'

/**
 * CreateReviewSessionCommand
 *
 * Creates a review session after a task assignment is completed.
 * This initiates the 360° review process.
 */
export default class CreateReviewSessionCommand {
  constructor(
    private readonly execCtx: ReviewActionContext,
    private readonly completedAssignmentReader: ReviewCompletedAssignmentReader,
    private readonly unitOfWork: ReviewSessionCreationUnitOfWork
  ) {}

  async handle(dto: CreateReviewSessionDTO): Promise<ReviewSessionRecord> {
    return this.unitOfWork.run(async (persistence) => {
      // Verify task assignment exists and is completed
      const assignment = await this.completedAssignmentReader.findCompletedAssignment(
        dto.task_assignment_id,
        persistence.transaction
      )

      if (!assignment) {
        throw new BusinessLogicException('Task assignment phải tồn tại và đã hoàn thành')
      }

      if (assignment.assigneeId !== dto.reviewee_id) {
        throw new BusinessLogicException('Reviewee must match assignment assignee')
      }

      // Check if review session already exists
      const existing = await persistence.findByTaskAssignment(dto.task_assignment_id)

      if (existing) {
        throw new ConflictException('Review session already exists for this assignment')
      }

      const creatorReviewerId = await persistence.resolveEffectiveCreatorReviewerId({
        taskAssignmentId: dto.task_assignment_id,
        revieweeId: dto.reviewee_id,
        creatorReviewerId: assignment.taskCreatorId,
      })

      // Create review session
      const session = await persistence.create({
        taskAssignmentId: dto.task_assignment_id,
        revieweeId: dto.reviewee_id,
        creatorReviewerId,
        requiredPeerReviews: dto.required_peer_reviews,
        requiredTotalReviews: REVIEW_DEFAULTS.MIN_TOTAL_REVIEWS,
        minimumManagerReviews: REVIEW_DEFAULTS.MIN_MANAGER_REVIEWS,
        minimumPeerReviews: REVIEW_DEFAULTS.MINIMUM_PEER_REVIEWS,
        deadline: new Date(
          Date.now() + REVIEW_DEFAULTS.REVIEW_SESSION_DEADLINE_HOURS * 60 * 60 * 1_000
        ),
      })

      await persistence.createReviewerAssignments(session)
      await persistence.writeCreatedAudit(this.execCtx, session.id, {
        taskAssignmentId: dto.task_assignment_id,
        revieweeId: dto.reviewee_id,
      })

      return session
    })
  }
}
