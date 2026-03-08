import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { ReviewSprintLifecycleUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_sprint_lifecycle_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface ExpireSprintReviewPackagesDTO {
  sprint_id: string
  reason?: string | null
}

export interface ExpireSprintReviewPackagesResult {
  sprint_id: string
  expired_package_count: number
}

const MANAGER_PROJECT_ROLES = new Set(['owner', 'project_owner', 'project_manager', 'manager'])

export default class ExpireSprintReviewPackagesCommand {
  constructor(
    private readonly execCtx: ReviewActionContext,
    private readonly sprintLifecycle: ReviewSprintLifecycleUnitOfWork
  ) {}

  async execute(dto: ExpireSprintReviewPackagesDTO): Promise<ExpireSprintReviewPackagesResult> {
    const actorId = this.requireUserId()
    return this.sprintLifecycle.run(async (session) => {
      const sprint = await session.loadSprintForUpdate(dto.sprint_id)
      if (!sprint) {
        throw new NotFoundException('Project sprint not found')
      }
      if (sprint.status !== 'review_open') {
        throw new BusinessLogicException('Project sprint review is not open')
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
      if (!actorCanManageSprint) {
        throw new ForbiddenException('Actor cannot manage project sprint')
      }

      const expiredPackageCount = await session.expirePendingPackages(sprint.id)

      await session.writeAudit(this.execCtx, {
        action: 'expire_sprint_review_packages',
        entityId: sprint.id,
        newValues: {
          expired_package_count: expiredPackageCount,
          reason: dto.reason ?? null,
        },
      })

      return {
        sprint_id: sprint.id,
        expired_package_count: expiredPackageCount,
      }
    })
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException()
    }

    return this.execCtx.userId
  }
}
