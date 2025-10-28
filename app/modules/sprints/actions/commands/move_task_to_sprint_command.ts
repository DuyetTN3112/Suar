import db from '@adonisjs/lucid/services/db'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/sprint_external_dependencies'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { assertCanManageProjectSprints } from '#modules/sprints/actions/support/project_sprint_access'
import { sprintExternalDeps } from '#modules/sprints/bootstrap/sprint_composition_root'
import {
  canAttachTaskToSprint,
  type ProjectSprintCoreStatus,
} from '#modules/sprints/domain/sprint_core_rules'
import type { TaskRecord } from '#modules/tasks/types/task_records'

export interface MoveTaskToSprintDTO {
  project_id: string
  task_id: string
  project_sprint_id: string | null
}

interface TaskRow {
  id: string
  project_id: string | null
  organization_id: string
}

interface SprintRow {
  id: string
  project_id: string
  status: ProjectSprintCoreStatus
}

export default class MoveTaskToSprintCommand {
  constructor(
    private readonly ctx: SprintActionContext,
    private readonly externalDependencies: SprintExternalDependencies = sprintExternalDeps
  ) {}

  async execute(dto: MoveTaskToSprintDTO): Promise<TaskRecord> {
    return db.transaction(async (trx) => {
      const access = await this.externalDependencies.projectAccess.resolveProjectSprintAccess(
        this.ctx,
        dto.project_id,
        trx
      )
      assertCanManageProjectSprints(access)

      const task = (await trx
        .from('tasks')
        .where('id', dto.task_id)
        .where('project_id', dto.project_id)
        .whereNull('deleted_at')
        .forUpdate()
        .select('id', 'project_id', 'organization_id')
        .first()) as TaskRow | undefined

      if (!task) {
        throw new NotFoundException('Task not found')
      }

      if (dto.project_sprint_id !== null) {
        const sprint = (await trx
          .from('project_sprints')
          .where('id', dto.project_sprint_id)
          .select('id', 'project_id', 'status')
          .first()) as SprintRow | undefined

        if (!sprint) {
          throw new NotFoundException('Project sprint not found')
        }

        const decision = canAttachTaskToSprint({
          taskProjectId: task.project_id,
          sprintProjectId: sprint.project_id,
          sprintStatus: sprint.status,
        })
        if (!decision.allowed) {
          throw new BusinessLogicException(decision.reason ?? 'Task cannot be attached to sprint')
        }
      }

      const [updated] = (await trx
        .from('tasks')
        .where('id', task.id)
        .update({
          project_sprint_id: dto.project_sprint_id,
          updated_at: trx.raw('CURRENT_TIMESTAMP'),
        })
        .returning('*')) as TaskRecord[]

      if (!updated) {
        throw new BusinessLogicException('Task sprint update failed')
      }

      return updated
    })
  }
}
