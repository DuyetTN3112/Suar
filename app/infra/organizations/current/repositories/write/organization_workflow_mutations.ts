import { DateTime } from 'luxon'

import TaskStatus from '#infra/tasks/models/task_status'
import type { DatabaseId } from '#types/database'

export interface CreateTaskStatusData {
  name: string
  color: string
}

export const createTaskStatus = async (
  organizationId: DatabaseId,
  data: CreateTaskStatusData
): Promise<TaskStatus> => {
  const maxOrderResult = await TaskStatus.query()
    .where('organization_id', organizationId)
    .max('sort_order as max_order')
    .first()

  const extras = maxOrderResult?.$extras as { max_order?: unknown }
  const maxOrder =
    typeof extras.max_order === 'number' ? extras.max_order : Number(extras.max_order ?? 0)

  return TaskStatus.create({
    organization_id: organizationId,
    name: data.name,
    slug: data.name.toLowerCase().replace(/\s+/g, '-'),
    category: 'in_progress',
    color: data.color,
    sort_order: maxOrder + 1,
    is_default: false,
    is_system: false,
  })
}

export const deleteTaskStatus = async (id: DatabaseId): Promise<void> => {
  const status = await TaskStatus.findOrFail(id)
  status.deleted_at = DateTime.now()
  await status.save()
}
