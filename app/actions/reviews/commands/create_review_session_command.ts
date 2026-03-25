import { BaseCommand } from '#actions/shared/base_command'
import ReviewSession from '#models/review_session'
import TaskAssignment from '#models/task_assignment'
import type { CreateReviewSessionDTO } from '#actions/reviews/dtos/request/review_dtos'
import ConflictException from '#exceptions/conflict_exception'
import emitter from '@adonisjs/core/services/emitter'

/**
 * CreateReviewSessionCommand
 *
 * Creates a review session after a task assignment is completed.
 * This initiates the 360° review process.
 */
export default class CreateReviewSessionCommand extends BaseCommand<
  CreateReviewSessionDTO,
  ReviewSession
> {
  async handle(dto: CreateReviewSessionDTO): Promise<ReviewSession> {
    return await this.executeInTransaction(async (trx) => {
      // Verify task assignment exists and is completed
      await TaskAssignment.query({ client: trx })
        .where('id', dto.task_assignment_id)
        .where('assignment_status', 'completed')
        .firstOrFail()

      // Check if review session already exists
      const existing = await ReviewSession.query({ client: trx })
        .where('task_assignment_id', dto.task_assignment_id)
        .first()

      if (existing) {
        throw new ConflictException('Review session already exists for this assignment')
      }

      // Create review session
      const session = await ReviewSession.create(
        {
          task_assignment_id: dto.task_assignment_id,
          reviewee_id: dto.reviewee_id,
          status: 'pending',
          manager_review_completed: false,
          peer_reviews_count: 0,
          required_peer_reviews: dto.required_peer_reviews,
        },
        { client: trx }
      )

      // Log audit
      await this.logAudit('create', 'review_session', session.id, null, {
        task_assignment_id: dto.task_assignment_id,
        reviewee_id: dto.reviewee_id,
      })

      // Emit audit event
      void emitter.emit('audit:log', {
        userId: this.getCurrentUserId(),
        action: 'create',
        entityType: 'review_session',
        entityId: session.id,
        newValues: {
          task_assignment_id: dto.task_assignment_id,
          reviewee_id: dto.reviewee_id,
        },
      })

      return session
    })
  }
}
