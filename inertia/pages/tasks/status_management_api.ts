import axios from 'axios'

import type { TaskStatusCreateInput } from './types.svelte'

export async function createTaskStatusDefinition(input: TaskStatusCreateInput) {
  const description = input.description?.trim()

  await axios.post('/api/task-statuses', {
    name: input.name,
    slug: input.slug,
    category: input.category,
    color: input.color ?? '#6B7280',
    description: description === '' ? undefined : description,
    sort_order: input.sortOrder,
  })
}

export async function deleteTaskStatusDefinition(statusId: string) {
  // APPROVED: GroupC - workflow-status-management
  await axios.delete(`/api/task-statuses/${statusId}`)
}
