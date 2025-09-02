import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { GetTaskApplicationsDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
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
    const cacheKey = this.generateCacheKey('task:applications', {
      taskId: dto.task_id,
      status: dto.status,
      page: dto.page,
    })

    return await this.executeWithCache(cacheKey, 60, async () => {
      const userId = this.getCurrentUserId()
      if (!userId) {
        throw new ForbiddenException('Authentication required to view task applications')
      }

      const task = await Task.find(dto.task_id)
      if (!task) {
        throw new NotFoundException('Task not found')
      }

      let isProjectOwnerOrManager = false
      if (task.project_id) {
        const { default: ProjectMember } = await import('#modules/projects/infra/models/project_member')
        const membership = await ProjectMember.query()
          .where('project_id', task.project_id)
          .where('user_id', userId)
          .whereIn('project_role', ['project_owner', 'project_manager'])
          .first()
        isProjectOwnerOrManager = membership !== null
      }

      enforcePolicy(
        canProcessApplication({
          actorId: userId,
          taskCreatorId: task.creator_id,
          action: 'approve',
          isTaskAlreadyAssigned: task.assigned_to !== null,
          isProjectOwnerOrManager,
        })
      )

      return TaskApplicationRepository.paginateByTask(dto.task_id, {
        status: dto.status,
        page: dto.page,
        perPage: dto.per_page,
      })
    })
  }
}
