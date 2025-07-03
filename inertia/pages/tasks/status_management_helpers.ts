export type TaskStatusDefinition = {
  id: string
  slug: string
  name: string
  is_system: boolean
}

export function buildStatusDefinitions(
  statuses: Array<{
    id?: string
    value: string
    label: string
    slug?: string
    is_system?: boolean
  }>
): TaskStatusDefinition[] {
  return statuses.map((status) => ({
    id: status.id ?? status.value,
    slug: status.slug ?? '',
    name: status.label,
    // Conservative fallback: treat missing flag as system status to avoid unsafe deletion.
    is_system: status.is_system ?? true,
  }))
}

export function getStatusMutationErrorMessage(error: unknown, fallback: string): string {
  return (
    (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback
  )
}

export function slugifyStatusName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s_]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 50)
}

export function canDeleteStatusDefinition(
  statusDefinitions: TaskStatusDefinition[],
  status: string,
  canManageWorkflow: boolean
): boolean {
  if (!canManageWorkflow) {
    return false
  }

  const definition = statusDefinitions.find((item) => item.id === status || item.slug === status)
  if (!definition) {
    return false
  }

  return !definition.is_system
}

export function findStatusDefinition(
  statusDefinitions: TaskStatusDefinition[],
  status: string
): TaskStatusDefinition | undefined {
  return statusDefinitions.find((item) => item.id === status || item.slug === status)
}
