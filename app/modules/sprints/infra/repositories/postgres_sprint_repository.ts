import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  SprintRepository,
  type CreateProjectSprintRecord,
  type SprintCoreRecord,
  type SprintTaskRecord,
  type SprintTransaction,
} from '#modules/sprints/actions/ports/outbound/sprint_repository'
import type { ProjectSprintUpdateAttributes } from '#modules/sprints/domain/project_sprint_policy'
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
      .select('id', 'project_id', 'organization_id')
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
}
