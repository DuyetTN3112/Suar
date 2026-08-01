import db from '@adonisjs/lucid/services/db'

import type {
  SprintBoardReader,
  SprintBoardSprint,
  SprintBoardTask,
} from '#modules/sprints/actions/ports/outbound/sprint_board_reader'

export class PostgresSprintBoardReader implements SprintBoardReader {
  async findSprint(projectId: string, sprintId?: string): Promise<SprintBoardSprint | null> {
    const query = db
      .from('project_sprints')
      .where('project_id', projectId)
      .select('id', 'name', 'goal', 'status', 'starts_at', 'ends_at')

    if (sprintId) {
      void query.where('id', sprintId)
    } else {
      void query.where('status', 'active').orderBy('starts_at', 'desc')
    }

    const sprint = (await query.first()) as SprintBoardSprint | undefined
    return sprint ?? null
  }

  async listTasks(projectId: string, sprintId: string | null): Promise<SprintBoardTask[]> {
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
