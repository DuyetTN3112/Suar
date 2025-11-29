import axios from 'axios'

import type { TaskStatusCreateInput } from '@/apps/org/modules/tasks/types/index.svelte'

export interface TaskStatusUpdateInput {
  name?: string
  slug?: string
  group?: string
  color?: string
  description?: string | null
  sortOrder?: number
}

export async function createTaskStatusDefinition(input: TaskStatusCreateInput) {
  const description = input.description?.trim()

  await axios.post('/api/v1/task-statuses', {
    name: input.name,
    slug: input.slug,
    group: input.group,
    color: input.color ?? '#6B7280',
    description: description === '' ? undefined : description,
    sortOrder: input.sortOrder,
  })
}

export async function deleteTaskStatusDefinition(statusId: string) {
  // APPROVED: GroupC - workflow-status-management
  await axios.delete(`/api/v1/task-statuses/${statusId}`)
}

export async function updateTaskStatusDefinition(statusId: string, input: TaskStatusUpdateInput) {
  await axios.patch(`/api/v1/task-statuses/${statusId}`, input)
}
