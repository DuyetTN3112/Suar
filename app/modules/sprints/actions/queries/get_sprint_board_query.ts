import db from '@adonisjs/lucid/services/db'

import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/sprint_external_dependencies'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { assertCanReadProjectSprints } from '#modules/sprints/actions/support/project_sprint_access'
import { sprintExternalDeps } from '#modules/sprints/bootstrap/sprint_composition_root'

export interface GetSprintBoardDTO {
  project_id: string
  project_sprint_id?: string | null
}

export interface SprintBoardTask {
  id: string
  title: string
  task_status_id: string | null
  status: string
  priority: string
  assigned_to: string | null
  project_sprint_id: string | null
  sort_order: number
  updated_at: string
}

export interface SprintBoardResult {
  project_id: string
  sprint: {
    id: string
    name: string
    goal: string | null
    status: string
    starts_at: string
    ends_at: string
  } | null
  backlog_tasks: SprintBoardTask[]
  sprint_tasks: SprintBoardTask[]
  counts: {
    backlog_tasks: number
    sprint_tasks: number
  }
}

interface SprintRow {
  id: string
  name: string
  goal: string | null
  status: string
  starts_at: string
  ends_at: string
}

export default class GetSprintBoardQuery {
  constructor(
    private readonly ctx: SprintActionContext,
    private readonly externalDependencies: SprintExternalDependencies = sprintExternalDeps
  ) {}

  async handle(dto: GetSprintBoardDTO): Promise<SprintBoardResult> {
    const access = await this.externalDependencies.projectAccess.resolveProjectSprintAccess(
      this.ctx,
      dto.project_id
    )
    assertCanReadProjectSprints(access)

    const sprint = await this.resolveSprint(dto.project_id, dto.project_sprint_id)
    const [backlogTasks, sprintTasks] = await Promise.all([
      this.listTasks(dto.project_id, null),
      sprint ? this.listTasks(dto.project_id, sprint.id) : Promise.resolve([]),
    ])

    return {
      project_id: dto.project_id,
      sprint,
      backlog_tasks: backlogTasks,
      sprint_tasks: sprintTasks,
      counts: {
        backlog_tasks: backlogTasks.length,
        sprint_tasks: sprintTasks.length,
      },
    }
  }

  private async resolveSprint(
    projectId: string,
    requestedSprintId: string | null | undefined
  ): Promise<SprintRow | null> {
    if (requestedSprintId === null) {
      return null
    }

    const query = db
      .from('project_sprints')
      .where('project_id', projectId)
      .select('id', 'name', 'goal', 'status', 'starts_at', 'ends_at')

    if (requestedSprintId) {
      void query.where('id', requestedSprintId)
    } else {
      void query.where('status', 'active').orderBy('starts_at', 'desc')
    }

    const sprint = (await query.first()) as SprintRow | undefined
    return sprint ?? null
  }

  private async listTasks(projectId: string, sprintId: string | null): Promise<SprintBoardTask[]> {
    const query = db
      .from('tasks')
      .where('project_id', projectId)
      .whereNull('deleted_at')
      .select(
        'id',
        'title',
        'task_status_id',
        'status',
        'priority',
        'assigned_to',
        'project_sprint_id',
        'sort_order',
        'updated_at'
      )
      .orderBy('sort_order', 'asc')
      .orderBy('updated_at', 'desc')
      .orderBy('id', 'desc')

    if (sprintId === null) {
      void query.whereNull('project_sprint_id')
    } else {
      void query.where('project_sprint_id', sprintId)
    }

    return (await query) as SprintBoardTask[]
  }

}
