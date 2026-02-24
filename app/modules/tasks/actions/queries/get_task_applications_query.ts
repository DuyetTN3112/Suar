import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { GetTaskApplicationsDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import {
  hasOrganizationApplicationReviewRole,
  hasProjectApplicationReviewRole,
} from '#modules/tasks/actions/support/task_application_review_roles'
import { canProcessApplication } from '#modules/tasks/domain/task_assignment_rules'
import Task from '#modules/tasks/infra/models/task'
import TaskApplicationRepository from '#modules/tasks/infra/repositories/task_application_repository'
import type { PaginatedTaskApplicationRecords } from '#modules/tasks/types/task_records'

/**
 * GetTaskApplicationsQuery
 *
 * Fetches applications for a task.
 * Used by project owners/managers to review applications.
 */
export default class GetTaskApplicationsQuery extends BaseQuery<
  GetTaskApplicationsDTO,
  PaginatedTaskApplicationRecords
> {
  async handle(dto: GetTaskApplicationsDTO): Promise<PaginatedTaskApplicationRecords> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new ForbiddenException('Authentication required to view task applications')
    }

    const task = await Task.find(dto.task_id)
    if (!task) {
      throw new NotFoundException('Task not found')
    }

    const [isProjectOwnerOrManager, isOrganizationOwnerOrAdmin] = await Promise.all([
      hasProjectApplicationReviewRole(userId, task.project_id),
      hasOrganizationApplicationReviewRole(userId, task.organization_id),
    ])

    enforcePolicy(
      canProcessApplication({
        actorId: userId,
        taskCreatorId: task.creator_id,
        action: 'reject',
        isTaskAlreadyAssigned: task.assigned_to !== null,
        isProjectOwnerOrManager,
        isOrganizationOwnerOrAdmin,
      })
    )

    const cacheKey = this.generateCacheKey('task:applications', {
      taskId: dto.task_id,
      status: dto.status,
      page: dto.page,
      perPage: dto.per_page,
      userId,
    })

    return await this.executeWithCache(cacheKey, 60, async () => {
      const options: { status?: string; page: number; perPage: number } = {
        page: dto.page,
        perPage: dto.per_page,
      }
      if (dto.status !== undefined) {
        options.status = dto.status
      }

      return TaskApplicationRepository.paginateByTask(dto.task_id, options)
    })
  }
}
