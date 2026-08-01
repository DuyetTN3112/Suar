import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { ReviewCryptography } from '#modules/reviews/actions/ports/outbound/review_cryptography'
import type {
  ReviewSprintPackageMutationPersistenceSession,
  ReviewSprintPackageMutationProject,
  ReviewSprintPackageMutationSprint,
  ReviewSprintPackageMutationUnitOfWork,
  ReviewSprintReverseWorkflowWrite,
} from '#modules/reviews/actions/ports/outbound/review_sprint_package_mutation_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  canTransitionProjectSprint,
  type ProjectSprintStatus,
} from '#modules/reviews/domain/sprint_review_rules'

export interface CloseProjectSprintReviewDTO {
  sprint_id: string
  project_id?: string
}

export interface CloseProjectSprintReviewResult {
  sprint_id: string
  status: 'review_open'
  review_opened_at: DateTime
  created_package_count: number
  reviewer_ids: string[]
  next_sprint_id: string
}

const PROJECT_SPRINT_STATUSES = new Set<ProjectSprintStatus>([
  'draft',
  'active',
  'review_open',
  'review_closed',
  'archived',
])

const MANAGER_PROJECT_ROLES = new Set(['owner', 'project_owner', 'project_manager', 'manager'])

export default class CloseProjectSprintReviewCommand {
  constructor(
    private readonly execCtx: ReviewActionContext,
    private readonly cryptography: ReviewCryptography,
    private readonly unitOfWork: ReviewSprintPackageMutationUnitOfWork
  ) {}

  async execute(dto: CloseProjectSprintReviewDTO): Promise<CloseProjectSprintReviewResult> {
    const actorId = this.requireUserId()

    return this.unitOfWork.run(async (session) => {
      const sprint = await session.loadSprintForUpdate(dto.sprint_id, dto.project_id)
      if (!sprint) {
        throw new NotFoundException('Project sprint not found')
      }

      const project = await session.loadProject(sprint.projectId)
      if (!project) {
        throw new NotFoundException('Project not found')
      }

      const actorRole = await session.findActorProjectRole(sprint.projectId, actorId)
      const sprintStatus = this.toProjectSprintStatus(sprint.status)
      const actorCanManageSprint =
        actorId === project.ownerId ||
        actorId === project.managerId ||
        (actorRole !== null && MANAGER_PROJECT_ROLES.has(actorRole))
      const transition = canTransitionProjectSprint({
        from: sprintStatus,
        to: 'review_open',
        actorCanManageSprint,
      })

      if (!transition.allowed) {
        if (!actorCanManageSprint) {
          throw new ForbiddenException(transition.reason ?? 'Actor cannot manage project sprint')
        }
        throw new BusinessLogicException(transition.reason ?? 'Invalid project sprint transition')
      }

      await this.assertPreviousReverseReviewsDone(sprint, session)
      await this.assertTaskReviewsDone(sprint.id, session)
      const reviewerIds = await session.findEligibleReviewerIds(sprint.projectId, sprint.id)
      const now = DateTime.utc()
      const openedAt = now.toJSDate()

      await session.markReviewOpen(sprint.id, actorId, openedAt)
      const existingPackages = await session.listPackages(sprint.id, reviewerIds)
      const existingReviewerIds = new Set(existingPackages.map((row) => row.reviewerId))
      const newReviewerIds = reviewerIds.filter(
        (reviewerId) => !existingReviewerIds.has(reviewerId)
      )
      await session.createReviewPackages(
        newReviewerIds.map((reviewerId) => ({
          id: this.cryptography.nextId(),
          sprintId: sprint.id,
          reviewerId,
          createdAt: openedAt,
        }))
      )
      await this.ensureReverseReviewWorkflows({
        sprint,
        project,
        reviewerIds,
        session,
        now: openedAt,
      })
      const nextSprintId = await this.createNextSprint({
        sprint,
        actorId,
        session,
        now: openedAt,
      })

      await session.writeAudit(this.execCtx, {
        action: 'open_sprint_review',
        entityType: 'project_sprint',
        entityId: sprint.id,
        newValues: {
          status: 'review_open',
          reviewer_ids: reviewerIds,
          created_package_count: newReviewerIds.length,
          next_sprint_id: nextSprintId,
        },
      })
      if (reviewerIds.length > 0) {
        await session.stageNotification({
          eventName: 'review.sprint_opened',
          businessEventId: sprint.id,
          type: 'review_requested',
          organizationId: sprint.organizationId,
          actorId,
          subjectType: 'project_sprint',
          subjectId: sprint.id,
          parameters: {
            reviewKind: 'sprint_review',
            sprintName: sprint.name,
            projectId: sprint.projectId,
          },
          occurredAt: openedAt.toISOString(),
          ...(this.execCtx.requestId ? { correlationId: this.execCtx.requestId } : {}),
          recipientIds: reviewerIds,
          now: openedAt,
        })
      }

      return {
        sprint_id: sprint.id,
        status: 'review_open',
        review_opened_at: now,
        created_package_count: newReviewerIds.length,
        reviewer_ids: reviewerIds,
        next_sprint_id: nextSprintId,
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

  private async assertTaskReviewsDone(
    sprintId: string,
    session: ReviewSprintPackageMutationPersistenceSession
  ): Promise<void> {
    const total = await session.countPendingTaskReviews(sprintId)
    if (total > 0) {
      throw new BusinessLogicException('Cannot close sprint while task reviews are not done', {
        pending_task_review_count: total,
      })
    }
  }

  private async assertPreviousReverseReviewsDone(
    sprint: ReviewSprintPackageMutationSprint,
    session: ReviewSprintPackageMutationPersistenceSession
  ): Promise<void> {
    const previousSprintId = await session.findPreviousSprintId(
      sprint.projectId,
      sprint.startsAt,
      sprint.id
    )
    if (!previousSprintId) {
      return
    }

    const total = await session.countPendingReverseReviewWorkflows(previousSprintId)
    if (total > 0) {
      throw new BusinessLogicException(
        'Cannot close sprint while previous review sau sprint workflows are not done',
        { pending_reverse_review_count: total, previous_sprint_id: previousSprintId }
      )
    }
  }

  private async ensureReverseReviewWorkflows(input: {
    sprint: ReviewSprintPackageMutationSprint
    project: ReviewSprintPackageMutationProject
    reviewerIds: string[]
    session: ReviewSprintPackageMutationPersistenceSession
    now: Date
  }): Promise<void> {
    const { sprint, project, reviewerIds, session, now } = input
    const packages = await session.listPackages(sprint.id, reviewerIds)
    const packageIdByReviewer = new Map(packages.map((row) => [row.reviewerId, row.id]))
    const existing = await session.listExistingReverseWorkflowTargets(sprint.id)
    const existingKeys = new Set(
      existing.map((row) =>
        [row.reviewerId, row.targetType, row.targetUserId ?? '', row.targetEntityId ?? ''].join(':')
      )
    )
    const workflowRows: ReviewSprintReverseWorkflowWrite[] = []
    const assignerTargets = await session.findAssignerTargets(sprint.projectId, sprint.id)

    for (const target of assignerTargets) {
      if (!reviewerIds.includes(target.reviewerId)) continue
      const key = [target.reviewerId, 'assigner', target.targetUserId, ''].join(':')
      if (existingKeys.has(key)) continue
      workflowRows.push({
        id: this.cryptography.nextId(),
        sprintId: sprint.id,
        projectId: sprint.projectId,
        organizationId: sprint.organizationId,
        reviewerId: target.reviewerId,
        targetType: 'assigner',
        targetUserId: target.targetUserId,
        targetEntityId: null,
        responderId: target.targetUserId,
        packageId: packageIdByReviewer.get(target.reviewerId) ?? null,
        createdAt: now,
      })
    }

    const environmentResponderId = await this.resolveEnvironmentResponder(
      sprint.organizationId,
      project,
      session
    )
    for (const reviewerId of reviewerIds) {
      const key = [reviewerId, 'environment', '', sprint.organizationId].join(':')
      if (existingKeys.has(key)) continue
      workflowRows.push({
        id: this.cryptography.nextId(),
        sprintId: sprint.id,
        projectId: sprint.projectId,
        organizationId: sprint.organizationId,
        reviewerId,
        targetType: 'environment',
        targetUserId: null,
        targetEntityId: sprint.organizationId,
        responderId: environmentResponderId,
        packageId: packageIdByReviewer.get(reviewerId) ?? null,
        createdAt: now,
      })
    }

    await session.createReverseReviewWorkflows(workflowRows)
  }

  private async resolveEnvironmentResponder(
    organizationId: string,
    project: ReviewSprintPackageMutationProject,
    session: ReviewSprintPackageMutationPersistenceSession
  ): Promise<string | null> {
    if (project.ownerId) return project.ownerId
    if (project.managerId) return project.managerId

    const organizationOwnerId = await session.loadOrganizationOwnerId(organizationId)
    if (organizationOwnerId) return organizationOwnerId

    return session.findApprovedOrganizationAdminId(organizationId)
  }

  private async createNextSprint(input: {
    sprint: ReviewSprintPackageMutationSprint
    actorId: string
    session: ReviewSprintPackageMutationPersistenceSession
    now: Date
  }): Promise<string> {
    const { sprint, actorId, session, now } = input
    const startsAt = this.parsePersistedDateTime(sprint.endsAt)
    const previousStartsAt = this.parsePersistedDateTime(sprint.startsAt)
    const durationMillis = startsAt.toMillis() - previousStartsAt.toMillis()
    const safeDurationMillis = durationMillis > 0 ? durationMillis : 14 * 24 * 60 * 60 * 1000
    const endsAt = startsAt.plus({ milliseconds: safeDurationMillis })
    const nextSprintId = this.cryptography.nextId()

    await session.createNextSprint({
      id: nextSprintId,
      organizationId: sprint.organizationId,
      projectId: sprint.projectId,
      name: `${sprint.name} next`,
      startsAt: startsAt.toJSDate(),
      endsAt: endsAt.toJSDate(),
      createdBy: actorId,
      createdAt: now,
    })

    return nextSprintId
  }

  private parsePersistedDateTime(value: string | Date): DateTime {
    if (value instanceof Date) return DateTime.fromJSDate(value).toUTC()
    return DateTime.fromISO(value, { setZone: true }).toUTC()
  }
}
