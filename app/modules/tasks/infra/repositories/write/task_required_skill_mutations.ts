import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import TaskRequiredSkill from '#modules/tasks/infra/models/task_required_skill'

export async function createMany(
  data: Partial<TaskRequiredSkill>[],
  trx?: TransactionClientContract
): Promise<TaskRequiredSkill[]> {
  const items: TaskRequiredSkill[] = []

  for (const item of data) {
    const created = await TaskRequiredSkill.create(item, trx ? { client: trx } : undefined)
    items.push(created)
  }

  return items
}

export async function deleteByTask(
  taskId: string,
  trx?: TransactionClientContract
): Promise<void> {
  const query = trx ? TaskRequiredSkill.query({ client: trx }) : TaskRequiredSkill.query()
  await query.where('task_id', taskId).delete()
}
