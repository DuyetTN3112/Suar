import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import TaskRequiredSkill from '#modules/tasks/infra/models/task_required_skill'
import TaskRequirementVersion from '#modules/tasks/infra/models/task_requirement_version'
import TaskRequirementVersionItem from '#modules/tasks/infra/models/task_requirement_version_item'

export type { TaskRequirementVersion, TaskRequirementVersionItem, TaskRequiredSkill }
export type { RequirementVersionReason } from '#modules/tasks/infra/models/task_requirement_version'

const queryTaskRequiredSkill = (trx?: TransactionClientContract) =>
  trx ? TaskRequiredSkill.query({ client: trx }) : TaskRequiredSkill.query()

const queryTaskRequirementVersion = (trx?: TransactionClientContract) =>
  trx ? TaskRequirementVersion.query({ client: trx }) : TaskRequirementVersion.query()

const queryTaskRequirementVersionItem = (trx?: TransactionClientContract) =>
  trx ? TaskRequirementVersionItem.query({ client: trx }) : TaskRequirementVersionItem.query()

export const TaskRequirementRepository = {
  // ── TaskRequiredSkill ──

  async findById(
    id: string,
    trx?: TransactionClientContract
  ): Promise<TaskRequiredSkill | null> {
    return queryTaskRequiredSkill(trx).where('id', id).first()
  },

  async findByTaskAndSkill(
    taskId: string,
    skillId: string,
    trx?: TransactionClientContract
  ): Promise<TaskRequiredSkill | null> {
    return queryTaskRequiredSkill(trx).where('task_id', taskId).where('skill_id', skillId).first()
  },

  async findByTask(
    taskId: string,
    trx?: TransactionClientContract
  ): Promise<TaskRequiredSkill[]> {
    return queryTaskRequiredSkill(trx).where('task_id', taskId)
  },

  async create(
    payload: Partial<TaskRequiredSkill>,
    trx?: TransactionClientContract
  ): Promise<TaskRequiredSkill> {
    if (trx) {
      return TaskRequiredSkill.create(payload, { client: trx })
    }
    return TaskRequiredSkill.create(payload)
  },

  async createMany(
    data: Partial<TaskRequiredSkill>[],
    trx?: TransactionClientContract
  ): Promise<TaskRequiredSkill[]> {
    const items: TaskRequiredSkill[] = []
    for (const item of data) {
      const created = await this.create(item, trx)
      items.push(created)
    }
    return items
  },

  async findByTaskWithRelations(
    taskId: string,
    trx?: TransactionClientContract
  ): Promise<TaskRequiredSkill[]> {
    return queryTaskRequiredSkill(trx)
      .where('task_id', taskId)
      .preload('skill')
      .preload('projectSkill')
      .preload('minimumLevel')
      .preload('targetLevel')
      .preload('assessmentCeilingLevel')
      .preload('rubricVersion')
  },

  // ── TaskRequirementVersion ──

  async findVersionById(
    id: string,
    withItems = false,
    trx?: TransactionClientContract
  ): Promise<TaskRequirementVersion | null> {
    let q = queryTaskRequirementVersion(trx).where('id', id)
    if (withItems) q = q.preload('items')
    return q.first()
  },

  async findLatestVersionByTask(
    taskId: string,
    withItems = false,
    trx?: TransactionClientContract
  ): Promise<TaskRequirementVersion | null> {
    let q = queryTaskRequirementVersion(trx).where('task_id', taskId).orderBy('version_number', 'desc')
    if (withItems) q = q.preload('items')
    return q.first()
  },

  async findVersionsByTask(
    taskId: string,
    trx?: TransactionClientContract
  ): Promise<TaskRequirementVersion[]> {
    return queryTaskRequirementVersion(trx)
      .where('task_id', taskId)
      .orderBy('version_number', 'asc')
      .preload('items')
  },

  async findVersionByTaskAndReason(
    taskId: string,
    reason: string,
    trx?: TransactionClientContract
  ): Promise<TaskRequirementVersion | null> {
    return queryTaskRequirementVersion(trx)
      .where('task_id', taskId)
      .where('reason', reason)
      .orderBy('version_number', 'desc')
      .first()
  },

  async createVersion(
    payload: Partial<TaskRequirementVersion>,
    trx?: TransactionClientContract
  ): Promise<TaskRequirementVersion> {
    if (trx) {
      return TaskRequirementVersion.create(payload, { client: trx })
    }
    return TaskRequirementVersion.create(payload)
  },

  // ── TaskRequirementVersionItem ──

  async findVersionItems(
    versionId: string,
    trx?: TransactionClientContract
  ): Promise<TaskRequirementVersionItem[]> {
    return queryTaskRequirementVersionItem(trx).where('requirement_version_id', versionId)
  },

  async createVersionItems(
    items: Partial<TaskRequirementVersionItem>[],
    trx?: TransactionClientContract
  ): Promise<TaskRequirementVersionItem[]> {
    const created: TaskRequirementVersionItem[] = []
    for (const item of items) {
      if (trx) {
        created.push(await TaskRequirementVersionItem.create(item, { client: trx }))
      } else {
        created.push(await TaskRequirementVersionItem.create(item))
      }
    }
    return created
  },
}
