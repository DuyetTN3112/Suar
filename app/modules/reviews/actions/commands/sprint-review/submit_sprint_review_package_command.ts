import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { ReviewCryptography } from '#modules/reviews/actions/ports/outbound/review_cryptography'
import type {
  ReviewSprintPackageMutationPersistenceSession,
  ReviewSprintPackageMutationProject,
  ReviewSprintPackageMutationSprint,
  ReviewSprintPackageMutationUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/review_sprint_package_mutation_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  resolveEligibleManagerTargets,
  validateSprintReviewPackage,
  type SprintEnvironmentTargetType,
  type SprintManagerTargetRole,
} from '#modules/reviews/domain/sprint_review_rules'

export interface SubmitSprintManagerReviewInput {
  target_user_id: string
  rating: number
  dimensions?: Record<string, unknown> | null
  comment?: string | null
  is_anonymous_to_target?: boolean
}

export interface SubmitSprintEnvironmentReviewInput {
  target_type: SprintEnvironmentTargetType
  target_id: string
  rating: number
  dimensions?: Record<string, unknown> | null
  comment?: string | null
  is_anonymous_publicly?: boolean
}

export interface SubmitSprintReviewPackageDTO {
  package_id: string
  manager_reviews: SubmitSprintManagerReviewInput[]
  environment_reviews: SubmitSprintEnvironmentReviewInput[]
}

export interface SubmitSprintReviewPackageResult {
  package_id: string
  sprint_id: string
  reviewer_id: string
  status: 'submitted'
  manager_reviews_count: number
  environment_reviews_count: number
  submitted_at: DateTime
}

export default class SubmitSprintReviewPackageCommand extends BaseCommand<
  SubmitSprintReviewPackageDTO,
  SubmitSprintReviewPackageResult
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly cryptography: ReviewCryptography,
    private readonly unitOfWork: ReviewSprintPackageMutationUnitOfWork
  ) {
    super(execCtx)
  }

  async handle(dto: SubmitSprintReviewPackageDTO): Promise<SubmitSprintReviewPackageResult> {
    const actorId = this.requireUserId()

    return this.unitOfWork.run(async (session) => {
      const reviewPackage = await session.loadPackageForUpdate(dto.package_id)
      if (!reviewPackage) throw new NotFoundException('Sprint review package not found')
      if (reviewPackage.reviewerId !== actorId) {
        throw new ForbiddenException('Only package reviewer can submit sprint review package')
      }
      if (reviewPackage.status !== 'pending') {
        throw new BusinessLogicException('Sprint review package is not pending')
      }
      const sprint = await session.loadSprint(reviewPackage.sprintId)
      if (!sprint) throw new NotFoundException('Project sprint not found')
      if (sprint.status !== 'review_open') {
        throw new BusinessLogicException('Project sprint review is not open')
      }
      const project = await session.loadProject(sprint.projectId)
      if (!project) throw new NotFoundException('Project not found')

      this.assertValidRatings(dto)
      this.assertEnvironmentTargets(dto, sprint)
      const eligibleManagerTargets = await this.findEligibleManagerTargets(
        actorId,
        sprint.projectId,
        project,
        session
      )
      const validation = validateSprintReviewPackage({
        reviewerId: actorId,
        eligibleManagerTargetIds: eligibleManagerTargets.map((target) => target.userId),
        environmentReviews: dto.environment_reviews.map((review) => ({
          targetType: review.target_type,
          targetId: review.target_id,
          rating: review.rating,
        })),
        managerReviews: dto.manager_reviews.map((review) => ({
          targetUserId: review.target_user_id,
          rating: review.rating,
        })),
      })
      if (!validation.allowed) {
        throw new BusinessLogicException(validation.reason ?? 'Invalid sprint review package')
      }

      const roleByTargetId = new Map(
        eligibleManagerTargets.map((target) => [target.userId, target.targetRole])
      )
      const now = DateTime.utc()
      const createdAt = now.toJSDate()
      await session.createManagerReviews(
        dto.manager_reviews.map((review) => ({
          id: this.cryptography.nextId(),
          packageId: reviewPackage.id,
          targetUserId: review.target_user_id,
          targetRole: roleByTargetId.get(review.target_user_id) as SprintManagerTargetRole,
          rating: review.rating,
          dimensions: review.dimensions ?? null,
          comment: review.comment ?? null,
          isAnonymousToTarget: review.is_anonymous_to_target ?? true,
          createdAt,
        }))
      )
      await session.createEnvironmentReviews(
        dto.environment_reviews.map((review) => ({
          id: this.cryptography.nextId(),
          packageId: reviewPackage.id,
          targetType: review.target_type,
          targetId: review.target_id,
          rating: review.rating,
          dimensions: review.dimensions ?? null,
          comment: review.comment ?? null,
          isAnonymousPublicly: review.is_anonymous_publicly ?? true,
          createdAt,
        }))
      )
      await session.markPackageSubmitted(reviewPackage.id, createdAt)
      await session.writeAudit(this.execCtx, {
        action: 'submit_sprint_review_package',
        entityType: 'sprint_review_package',
        entityId: reviewPackage.id,
        newValues: {
          sprint_id: reviewPackage.sprintId,
          manager_reviews_count: dto.manager_reviews.length,
          environment_reviews_count: dto.environment_reviews.length,
        },
      })
      return {
        package_id: reviewPackage.id,
        sprint_id: reviewPackage.sprintId,
        reviewer_id: reviewPackage.reviewerId,
        status: 'submitted',
        manager_reviews_count: dto.manager_reviews.length,
        environment_reviews_count: dto.environment_reviews.length,
        submitted_at: now,
      }
    })
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) throw new UnauthorizedException()
    return this.execCtx.userId
  }

  private assertValidRatings(dto: SubmitSprintReviewPackageDTO): void {
    const ratings = [
      ...dto.manager_reviews.map((review) => review.rating),
      ...dto.environment_reviews.map((review) => review.rating),
    ]
    if (ratings.some((rating) => !Number.isInteger(rating) || rating < 1 || rating > 5)) {
      throw new BusinessLogicException('Sprint review ratings must be integers from 1 to 5')
    }
  }

  private assertEnvironmentTargets(
    dto: SubmitSprintReviewPackageDTO,
    sprint: ReviewSprintPackageMutationSprint
  ): void {
    for (const review of dto.environment_reviews) {
      if (review.target_type === 'project' && review.target_id !== sprint.projectId) {
        throw new BusinessLogicException('Project environment review target does not match sprint project')
      }
      if (review.target_type === 'organization' && review.target_id !== sprint.organizationId) {
        throw new BusinessLogicException('Organization environment review target does not match sprint organization')
      }
    }
  }

  private async findEligibleManagerTargets(
    reviewerId: string,
    projectId: string,
    project: ReviewSprintPackageMutationProject,
    session: ReviewSprintPackageMutationPersistenceSession
  ) {
    const evidence = await session.findManagerTargetEvidence(projectId)
    const candidates = new Map(
      evidence.map((row) => [
        row.userId,
        {
          ...row,
          projectManagerDuringSprint: row.userId === project.managerId,
          projectOwnerDuringSprint: row.userId === project.ownerId,
          explicitSprintLead: false,
        },
      ])
    )
    for (const userId of [project.ownerId, project.managerId]) {
      if (!userId) continue
      const existing = candidates.get(userId)
      candidates.set(userId, {
        userId,
        assignedTaskCount: existing?.assignedTaskCount ?? 0,
        createdTaskCount: existing?.createdTaskCount ?? 0,
        projectManagerDuringSprint: userId === project.managerId,
        projectOwnerDuringSprint: userId === project.ownerId,
        explicitSprintLead: false,
      })
    }
    return resolveEligibleManagerTargets({ reviewerId, candidates: Array.from(candidates.values()) })
  }
}
