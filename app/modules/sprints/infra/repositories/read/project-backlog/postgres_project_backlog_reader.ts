import db from '@adonisjs/lucid/services/db'

import type { ProjectBacklogReader } from '#modules/sprints/actions/ports/outbound/project-backlog/project_backlog_reader'
import type { SprintBoardTask } from '#modules/sprints/public_contracts/sprint_public_api'

export class PostgresProjectBacklogReader implements ProjectBacklogReader {
  async list(projectId: string, offset: number, limit: number, statuses: string[] = []) {
    const query = db
      .from('tasks')
      .where('project_id', projectId)
      .whereNull('project_sprint_id')
      .whereNull('deleted_at')
      .select('id', 'title', 'task_status_id', 'status', 'priority', 'assigned_to', 'project_sprint_id', 'sort_order', 'updated_at')
      .orderBy('sort_order', 'asc')
      .orderBy('priority', 'desc')
      .orderBy('updated_at', 'desc')
      .orderBy('id', 'desc')
    if (statuses.length > 0) void query.whereIn('status', statuses)
    const totalRow = (await query.clone().clearSelect().clearOrder().count('* as total').first()) as { total?: string | number } | undefined
    return {
      total: Number(totalRow?.total ?? 0),
      tasks: (await query.offset(offset).limit(limit)) as SprintBoardTask[],
    }
  }
}
