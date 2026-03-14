import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
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

interface PackageRecord {
  id: string
  sprint_id: string
  reviewer_id: string
  status: string
}

interface SprintRecord {
  id: string
  organization_id: string
  project_id: string
  status: string
}

interface ProjectRecord {
  owner_id: string | null
  manager_id: string | null
}

export default class SubmitSprintReviewPackageCommand {
  constructor(private readonly execCtx: ReviewActionContext) {}

  async execute(dto: SubmitSprintReviewPackageDTO): Promise<SubmitSprintReviewPackageResult> {
    const actorId = this.requireUserId()
    const trx = await db.transaction()

    try {
      const reviewPackage = (await trx
        .from('sprint_review_packages')
        .where('id', dto.package_id)
        .forUpdate()
        .first()) as PackageRecord | undefined

      if (!reviewPackage) {
        throw new NotFoundException('Sprint review package not found')
      }
      if (reviewPackage.reviewer_id !== actorId) {
        throw new ForbiddenException('Only package reviewer can submit sprint review package')
      }
      if (reviewPackage.status !== 'pending') {
        throw new BusinessLogicException('Sprint review package is not pending')
      }

      const sprint = (await trx
        .from('project_sprints')
        .where('id', reviewPackage.sprint_id)
        .first()) as SprintRecord | undefined
      if (!sprint) {
        throw new NotFoundException('Project sprint not found')
      }
      if (sprint.status !== 'review_open') {
        throw new BusinessLogicException('Project sprint review is not open')
      }

      const project = (await trx
        .from('projects')
        .where('id', sprint.project_id)
        .whereNull('deleted_at')
        .select('owner_id', 'manager_id')
        .first()) as ProjectRecord | undefined
      if (!project) {
        throw new NotFoundException('Project not found')
      }

      this.assertValidRatings(dto)
      this.assertEnvironmentTargets(dto, sprint)

      const eligibleManagerTargets = await this.findEligibleManagerTargets(
        actorId,
        sprint.project_id,
        project,
        trx
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

      if (dto.manager_reviews.length > 0) {
        await trx.table('sprint_manager_reviews').multiInsert(
          dto.manager_reviews.map((review) => ({
            id: randomUUID(),
            package_id: reviewPackage.id,
            target_user_id: review.target_user_id,
            target_role: roleByTargetId.get(review.target_user_id) as SprintManagerTargetRole,
            rating: review.rating,
            dimensions: JSON.stringify(review.dimensions ?? null),
            comment: review.comment ?? null,
            is_anonymous_to_target: review.is_anonymous_to_target ?? true,
            created_at: now.toSQL(),
            updated_at: now.toSQL(),
          }))
        )
      }

      await trx.table('sprint_environment_reviews').multiInsert(
        dto.environment_reviews.map((review) => ({
          id: randomUUID(),
          package_id: reviewPackage.id,
          target_type: review.target_type,
          target_id: review.target_id,
          rating: review.rating,
          dimensions: JSON.stringify(review.dimensions ?? null),
          comment: review.comment ?? null,
          is_anonymous_publicly: review.is_anonymous_publicly ?? true,
          created_at: now.toSQL(),
          updated_at: now.toSQL(),
        }))
      )

      await trx
        .from('sprint_review_packages')
        .where('id', reviewPackage.id)
        .update({
          status: 'submitted',
          submitted_at: now.toSQL(),
          updated_at: now.toSQL(),
        })

      await trx.commit()

      await auditPublicApi.write(this.execCtx, {
        action: 'submit_sprint_review_package',
        entity_type: 'sprint_review_package',
        entity_id: reviewPackage.id,
        new_values: {
          sprint_id: reviewPackage.sprint_id,
          manager_reviews_count: dto.manager_reviews.length,
          environment_reviews_count: dto.environment_reviews.length,
        },
      })

      return {
        package_id: reviewPackage.id,
        sprint_id: reviewPackage.sprint_id,
        reviewer_id: reviewPackage.reviewer_id,
        status: 'submitted',
        manager_reviews_count: dto.manager_reviews.length,
        environment_reviews_count: dto.environment_reviews.length,
        submitted_at: now,
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException()
    }

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
    sprint: SprintRecord
  ): void {
    for (const review of dto.environment_reviews) {
      if (review.target_type === 'project' && review.target_id !== sprint.project_id) {
        throw new BusinessLogicException('Project environment review target does not match sprint project')
      }
      if (review.target_type === 'organization' && review.target_id !== sprint.organization_id) {
        throw new BusinessLogicException(
          'Organization environment review target does not match sprint organization'
        )
      }
    }
  }

  private async findEligibleManagerTargets(
    reviewerId: string,
    projectId: string,
    project: ProjectRecord,
    trx: TransactionClientContract
  ) {
    const rowsResult: unknown = await trx.rawQuery(
      `
        select
          user_id,
          sum(assigned_task_count)::int as assigned_task_count,
          sum(created_task_count)::int as created_task_count
        from (
          select assigned_by as user_id, count(*) as assigned_task_count, 0 as created_task_count
          from task_assignments ta
          inner join tasks t on t.id = ta.task_id
          where t.project_id = ?
          group by assigned_by
          union all
          select creator_id as user_id, 0 as assigned_task_count, count(*) as created_task_count
          from tasks
          where project_id = ?
          group by creator_id
        ) evidence
        where user_id is not null
        group by user_id
      `,
      [projectId, projectId]
    )
    const rows = rowsResult as {
      rows?: {
        user_id: string
        assigned_task_count: number | string
        created_task_count: number | string
      }[]
    }

    const candidates = new Map<
      string,
      {
        userId: string
        assignedTaskCount: number
        createdTaskCount: number
        projectManagerDuringSprint: boolean
        projectOwnerDuringSprint: boolean
        explicitSprintLead: boolean
      }
    >()

    for (const row of rows.rows ?? []) {
      candidates.set(row.user_id, {
        userId: row.user_id,
        assignedTaskCount: Number(row.assigned_task_count),
        createdTaskCount: Number(row.created_task_count),
        projectManagerDuringSprint: row.user_id === project.manager_id,
        projectOwnerDuringSprint: row.user_id === project.owner_id,
        explicitSprintLead: false,
      })
    }

    for (const userId of [project.owner_id, project.manager_id]) {
      if (!userId) continue
      const existing = candidates.get(userId)
      candidates.set(userId, {
        userId,
        assignedTaskCount: existing?.assignedTaskCount ?? 0,
        createdTaskCount: existing?.createdTaskCount ?? 0,
        projectManagerDuringSprint: userId === project.manager_id,
        projectOwnerDuringSprint: userId === project.owner_id,
        explicitSprintLead: false,
      })
    }

    return resolveEligibleManagerTargets({
      reviewerId,
      candidates: Array.from(candidates.values()),
    })
  }
}
