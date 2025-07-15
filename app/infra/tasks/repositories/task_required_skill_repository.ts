import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import TaskRequiredSkill from '#models/task_required_skill'

export default class TaskRequiredSkillRepository {
  private readonly __instanceMarker = true

  static {
    void new TaskRequiredSkillRepository().__instanceMarker
  }

  static async createMany(
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
}
