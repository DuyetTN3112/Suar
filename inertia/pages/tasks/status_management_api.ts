import axios from 'axios'

export async function createTaskStatusDefinition(input: {
  name: string
  slug: string
  sortOrder: number
}) {
  // APPROVED: GroupC - workflow-status-management
  await axios.post('/api/task-statuses', {
    name: input.name,
    slug: input.slug,
    category: 'in_progress',
    color: '#6B7280',
    sort_order: input.sortOrder,
  })
}

export async function deleteTaskStatusDefinition(statusId: string) {
  // APPROVED: GroupC - workflow-status-management
  await axios.delete(`/api/task-statuses/${statusId}`)
}
