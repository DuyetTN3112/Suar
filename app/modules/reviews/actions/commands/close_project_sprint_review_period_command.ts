import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { ReviewSprintLifecycleUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_sprint_lifecycle_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  canTransitionProjectSprint,
  type ProjectSprintStatus,
} from '#modules/reviews/domain/sprint_review_rules'

export interface CloseProjectSprintReviewPeriodDTO {
  sprint_id: string
}

export interface CloseProjectSprintReviewPeriodResult {
  sprint_id: string
  status: 'review_closed'
  review_closed_at: DateTime
  closed_package_count: number
}

const PROJECT_SPRINT_STATUSES = new Set<ProjectSprintStatus>([
  'draft',
  'active',
  'review_open',
  'review_closed',
  'archived',
])

const MANAGER_PROJECT_ROLES = new Set(['owner', 'project_owner', 'project_manager', 'manager'])

export default class CloseProjectSprintReviewPeriodCommand {
  constructor(
    private readonly execCtx: ReviewActionContext,
    private readonly sprintLifecycle: ReviewSprintLifecycleUnitOfWork
  ) {}

  async execute(
    dto: CloseProjectSprintReviewPeriodDTO
  ): Promise<CloseProjectSprintReviewPeriodResult> {
    const actorId = this.requireUserId()
    return this.sprintLifecycle.run(async (session) => {
      const sprint = await session.loadSprintForUpdate(dto.sprint_id)
      if (!sprint) {
        throw new NotFoundException('Project sprint not found')
      }

      const project = await session.loadProject(sprint.projectId)
      if (!project) {
        throw new NotFoundException('Project not found')
      }

      const actorRole = await session.findActorProjectRole(sprint.projectId, actorId)
      const actorCanManageSprint =
        actorId === project.ownerId ||
        actorId === project.managerId ||
        (actorRole !== null && MANAGER_PROJECT_ROLES.has(actorRole))
      const transition = canTransitionProjectSprint({
        from: this.toProjectSprintStatus(sprint.status),
        to: 'review_closed',
        actorCanManageSprint,
      })

      if (!transition.allowed) {
        if (!actorCanManageSprint) {
          throw new ForbiddenException(transition.reason ?? 'Actor cannot manage project sprint')
        }
        throw new BusinessLogicException(transition.reason ?? 'Invalid project sprint transition')
      }

      const counts = await session.countPackages(sprint.id)
      const pendingWorkflowCount = await session.countPendingReverseReviewWorkflows(sprint.id)
      if (pendingWorkflowCount > 0) {
        throw new BusinessLogicException(
          `Cannot close sprint review period with ${pendingWorkflowCount} unfinished reverse review workflows`,
          {
            pending_reverse_review_count: pendingWorkflowCount,
          }
        )
      }

      if (counts.pending > 0) {
        throw new BusinessLogicException(
          `Cannot close sprint review period with ${counts.pending} pending sprint review packages`,
          {
            pending_package_count: counts.pending,
            submitted_package_count: counts.submitted,
          }
        )
      }

      const now = DateTime.utc()
      await session.markReviewClosed(sprint.id, now.toJSDate())
      await session.recalculateTargetStats(sprint.id)

      await session.writeAudit(this.execCtx, {
        action: 'close_sprint_review_period',
        entityId: sprint.id,
        newValues: {
          status: 'review_closed',
          submitted_package_count: counts.submitted,
        },
      })

      return {
        sprint_id: sprint.id,
        status: 'review_closed',
        review_closed_at: now,
        closed_package_count: counts.submitted,
      }
    })
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException()
    }

    return this.execCtx.userId
  }

  private toProjectSprintStatus(status: string): ProjectSprintStatus {
    if (!PROJECT_SPRINT_STATUSES.has(status as ProjectSprintStatus)) {
      throw new PersistedDataIntegrityException(
        'Persisted project sprint status is outside the review lifecycle contract',
        {
          status,
        }
      )
    }

    return status as ProjectSprintStatus
  }
}
