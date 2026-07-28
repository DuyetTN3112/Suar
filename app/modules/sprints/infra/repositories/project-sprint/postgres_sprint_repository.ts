import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  SprintRepository,
  type CreateProjectSprintRecord,
  type SprintCoreRecord,
  type SprintTaskRecord,
  type SprintTransaction,
  type SprintAssignmentTransitionInput,
} from '#modules/sprints/actions/ports/outbound/sprint_repository'
import type { ProjectSprintUpdateAttributes } from '#modules/sprints/domain/project-sprint/project_sprint_policy'
import type {
  ProjectSprintAssignmentHistoryRecord,
  SprintAssignmentEntryReason,
} from '#modules/sprints/public_contracts/task-sprint-assignment/project_sprint_assignment_history'
import type {
  ProjectSprintRecord,
  SprintTaskAssignmentRecord,
} from '#modules/sprints/public_contracts/sprint_public_api'

function transactionClient(trx: SprintTransaction): TransactionClientContract {
  return trx as TransactionClientContract
}

export class PostgresSprintRepository extends SprintRepository {
  async create(input: CreateProjectSprintRecord): Promise<ProjectSprintRecord | null> {
    const [created] = (await db
      .table('project_sprints')
      .insert({
        id: randomUUID(),
        ...input,
        closed_by: null,
        review_opened_at: null,
        review_closed_at: null,
        created_at: db.raw('CURRENT_TIMESTAMP'),
        updated_at: db.raw('CURRENT_TIMESTAMP'),
      })
      .returning('*')) as ProjectSprintRecord[]
    return created ?? null
  }

  async find(projectId: string, sprintId: string): Promise<ProjectSprintRecord | null> {
    const sprint = (await db
      .from('project_sprints')
      .where('id', sprintId)
      .where('project_id', projectId)
      .first()) as ProjectSprintRecord | undefined
    return sprint ?? null
  }

  async list(
    projectId: string,
    offset: number,
    limit: number
  ): Promise<{ data: ProjectSprintRecord[]; total: number }> {
    const query = db
      .from('project_sprints')
      .where('project_id', projectId)
      .orderBy('starts_at', 'desc')
      .select(
        'project_sprints.*',
        db.raw(`
          (
            select count(*)::int
            from sprint_reverse_review_workflows workflow
            where workflow.sprint_id = project_sprints.id
              and workflow.status <> 'done'
          ) as reverse_review_pending_count
        `),
        db.raw(`
          (
            select count(*)::int
            from sprint_reverse_review_workflows workflow
            where workflow.sprint_id = project_sprints.id
              and workflow.target_type = 'assigner'
              and workflow.status <> 'done'
          ) as reverse_review_assigner_pending_count
        `),
        db.raw(`
          (
            select count(*)::int
            from sprint_reverse_review_workflows workflow
            where workflow.sprint_id = project_sprints.id
              and workflow.target_type = 'environment'
              and workflow.status <> 'done'
          ) as reverse_review_environment_pending_count
        `)
      )
    const totalRow = (await query
      .clone()
      .clearSelect()
      .clearOrder()
      .count('* as total')
      .first()) as { total?: string | number } | undefined
    return {
      total: Number(totalRow?.total ?? 0),
      data: (await query.offset(offset).limit(limit)) as ProjectSprintRecord[],
    }
  }

  async findForUpdate(
    projectId: string,
    sprintId: string,
    transaction: SprintTransaction
  ): Promise<ProjectSprintRecord | null> {
    const sprint = (await transactionClient(transaction)
      .from('project_sprints')
      .where('id', sprintId)
      .where('project_id', projectId)
      .forUpdate()
      .first()) as ProjectSprintRecord | undefined
    return sprint ?? null
  }

  async lockProjectPlanning(projectId: string, transaction: SprintTransaction): Promise<void> {
    await transactionClient(transaction).rawQuery('SELECT pg_advisory_xact_lock(hashtext(?))', [projectId])
  }

  async countActive(projectId: string, transaction: SprintTransaction): Promise<number> {
    const row = (await transactionClient(transaction)
      .from('project_sprints')
      .where('project_id', projectId)
      .where('status', 'active')
      .count('* as total')
      .first()) as { total?: string | number } | undefined
    return Number(row?.total ?? 0)
  }

  async findSprintTasksForUpdate(projectId: string, sprintId: string, transaction: SprintTransaction) {
    return (await transactionClient(transaction)
      .from('tasks')
      .where('project_id', projectId)
      .where('project_sprint_id', sprintId)
      .whereNull('deleted_at')
      .forUpdate()
      .select('id', 'project_id', 'organization_id', 'project_sprint_id', 'status')) as Array<{
      id: string
      project_id: string | null
      organization_id: string
      project_sprint_id: string | null
      status: string
    }>
  }

  async reorderBacklog(input: { project_id: string; task_id: string; before_task_id?: string | null; after_task_id?: string | null }, transaction: SprintTransaction): Promise<void> {
    const trx = transactionClient(transaction)
    const rows = (await trx.from('tasks').where('project_id', input.project_id).whereNull('project_sprint_id').whereNull('deleted_at').select('id').orderBy('sort_order', 'asc').orderBy('updated_at', 'desc').orderBy('id', 'desc').forUpdate()) as Array<{ id: string }>
    const ids = rows.map((row) => row.id).filter((id) => id !== input.task_id)
    const position = input.before_task_id ? ids.indexOf(input.before_task_id) : input.after_task_id ? ids.indexOf(input.after_task_id) + 1 : ids.length
    ids.splice(Math.max(0, position), 0, input.task_id)
    for (const [index, id] of ids.entries()) {
      await trx.from('tasks').where('id', id).update({ sort_order: index + 1, updated_at: trx.raw('CURRENT_TIMESTAMP') })
    }
  }

  async update(
    sprintId: string,
    attributes: ProjectSprintUpdateAttributes,
    transaction: SprintTransaction
  ): Promise<ProjectSprintRecord | null> {
    const [updated] = (await transactionClient(transaction)
      .from('project_sprints')
      .where('id', sprintId)
      .update({
        ...attributes,
        updated_at: transactionClient(transaction).raw('CURRENT_TIMESTAMP'),
      })
      .returning('*')) as ProjectSprintRecord[]
    return updated ?? null
  }

  async findTaskForUpdate(
    projectId: string,
    taskId: string,
    transaction: SprintTransaction
  ): Promise<SprintTaskRecord | null> {
    const task = (await transactionClient(transaction)
      .from('tasks')
      .where('id', taskId)
      .where('project_id', projectId)
      .whereNull('deleted_at')
      .forUpdate()
      .select('id', 'project_id', 'organization_id', 'project_sprint_id')
      .first()) as SprintTaskRecord | undefined
    return task ?? null
  }

  async findCore(
    sprintId: string,
    transaction: SprintTransaction
  ): Promise<SprintCoreRecord | null> {
    const sprint = (await transactionClient(transaction)
      .from('project_sprints')
      .where('id', sprintId)
      .select('id', 'project_id', 'status')
      .first()) as SprintCoreRecord | undefined
    return sprint ?? null
  }

  async assignTask(
    taskId: string,
    sprintId: string | null,
    transaction: SprintTransaction
  ): Promise<SprintTaskAssignmentRecord | null> {
    const trx = transactionClient(transaction)
    const [updated] = (await trx
      .from('tasks')
      .where('id', taskId)
      .update({
        project_sprint_id: sprintId,
        updated_at: trx.raw('CURRENT_TIMESTAMP'),
      })
      .returning(['id', 'project_id', 'project_sprint_id', 'updated_at'])) as SprintTaskAssignmentRecord[]
    return updated ?? null
  }

  async recordAssignmentTransition(
    input: SprintAssignmentTransitionInput,
    transaction: SprintTransaction
  ): Promise<void> {
    const trx = transactionClient(transaction)
    const current = (await trx
      .from('project_sprint_task_assignments')
      .where('project_id', input.project_id)
      .where('task_id', input.task_id)
      .whereNull('exited_at')
      .forUpdate()
      .first()) as { id: string } | undefined

    if (current) {
      await trx
        .from('project_sprint_task_assignments')
        .where('id', current.id)
        .update({
          exited_at: trx.raw('clock_timestamp()'),
          exit_reason: input.exit_reason,
        })
    } else {
      await trx.table('project_sprint_task_assignments').insert({
        id: randomUUID(),
        organization_id: input.organization_id,
        project_id: input.project_id,
        task_id: input.task_id,
        sprint_id: input.previous_sprint_id,
        entry_reason: input.previous_sprint_id ? 'planned' : 'created_in_backlog',
        exit_reason: input.exit_reason,
        added_after_start: false,
        actor_id: input.actor_id,
        entered_at: trx.raw("clock_timestamp() - interval '1 microsecond'"),
        exited_at: trx.raw('clock_timestamp()'),
        created_at: trx.raw('clock_timestamp()'),
      })
    }

    await trx.table('project_sprint_task_assignments').insert({
      id: randomUUID(),
      organization_id: input.organization_id,
      project_id: input.project_id,
      task_id: input.task_id,
      sprint_id: input.next_sprint_id,
      entry_reason: input.entry_reason,
      exit_reason: null,
      added_after_start: input.added_after_start,
      actor_id: input.actor_id,
      entered_at: trx.raw('clock_timestamp()'),
      exited_at: null,
      created_at: trx.raw('clock_timestamp()'),
    })
  }

  async recordInitialAssignment(
    input: {
      organization_id: string
      project_id: string
      task_id: string
      sprint_id: string | null
      entry_reason: SprintAssignmentEntryReason
      added_after_start: boolean
      actor_id: string | null
    },
    transaction: SprintTransaction
  ): Promise<void> {
    const trx = transactionClient(transaction)
    await trx.table('project_sprint_task_assignments').insert({
      id: randomUUID(),
      organization_id: input.organization_id,
      project_id: input.project_id,
      task_id: input.task_id,
      sprint_id: input.sprint_id,
      entry_reason: input.entry_reason,
      exit_reason: null,
      added_after_start: input.added_after_start,
      actor_id: input.actor_id,
      entered_at: trx.raw('clock_timestamp()'),
      exited_at: null,
      created_at: trx.raw('clock_timestamp()'),
    })
  }

  async initializeSprintTaskAssignments(
    projectId: string,
    sprintId: string,
    actorId: string | null,
    transaction: SprintTransaction
  ): Promise<void> {
    const trx = transactionClient(transaction)
    const tasks = (await trx
      .from('tasks')
      .where('project_id', projectId)
      .where('project_sprint_id', sprintId)
      .whereNull('deleted_at')
      .select('id', 'organization_id')
      .forUpdate()) as Array<{ id: string; organization_id: string }>

    for (const task of tasks) {
      const existing = (await trx
        .from('project_sprint_task_assignments')
        .where({ project_id: projectId, task_id: task.id })
        .whereNull('exited_at')
        .first()) as { id: string } | undefined
      if (existing) continue
      await this.recordInitialAssignment({
        organization_id: task.organization_id,
        project_id: projectId,
        task_id: task.id,
        sprint_id: sprintId,
        entry_reason: 'planned',
        added_after_start: false,
        actor_id: actorId,
      }, transaction)
    }
  }

  async listTaskAssignmentHistory(
    projectId: string,
    taskId: string
  ): Promise<ProjectSprintAssignmentHistoryRecord[]> {
    const history = (await db
      .from('project_sprint_task_assignments')
      .where('project_id', projectId)
      .where('task_id', taskId)
      .orderBy('entered_at', 'asc')
      .orderBy('id', 'asc')) as ProjectSprintAssignmentHistoryRecord[]
    if (history.length > 0) return history

    const task = (await db
      .from('tasks')
      .where('project_id', projectId)
      .where('id', taskId)
      .whereNull('deleted_at')
      .select('id', 'organization_id', 'project_id', 'project_sprint_id', 'created_at')
      .first()) as {
      id: string
      organization_id: string
      project_id: string
      project_sprint_id: string | null
      created_at: Date | string
    } | undefined
    if (!task) return []

    const enteredAt = task.created_at instanceof Date
      ? task.created_at.toISOString()
      : new Date(task.created_at).toISOString()
    return [{
      id: `initial:${task.id}`,
      organization_id: task.organization_id,
      project_id: task.project_id,
      task_id: task.id,
      sprint_id: task.project_sprint_id,
      entered_at: enteredAt,
      exited_at: null,
      entry_reason: task.project_sprint_id ? 'planned' : 'created_in_backlog',
      exit_reason: null,
      added_after_start: false,
      actor_id: null,
      created_at: enteredAt,
    }]
  }
}
