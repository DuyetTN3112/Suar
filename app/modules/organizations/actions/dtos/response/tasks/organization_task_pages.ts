export interface OrganizationTasksIndexPageResult {
  tasks: object
  stats: object
  metadata: object
  projectOptions: Array<{ id: string; name: string }>
  projectContext: object
  permissions: object
  filters: Record<string, unknown>
}

export interface OrganizationTaskDetailPage {
  task: object
  permissions: object
  auditLogs?: unknown[]
  taskReviewDetail?: Record<string, unknown> | null
}
