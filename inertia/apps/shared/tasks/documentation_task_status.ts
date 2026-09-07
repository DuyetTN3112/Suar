export const DOCUMENTATION_TASK_STATUS_SLUG = 'docs'

export interface DocumentationTaskStatusOption {
  value: string
  slug?: string
  category?: string
}

/**
 * The Docs role, not a status label, marks an item as project documentation.
 * The slug fallback keeps pre-migration Docs items safe. Task type and visible
 * status label must never change this behaviour.
 */
export function isDocumentationTaskStatusId(
  statusId: string,
  statuses: readonly DocumentationTaskStatusOption[] | undefined
): boolean {
  const status = statuses?.find((item) => item.value === statusId)
  return status?.category === 'docs' || status?.slug === DOCUMENTATION_TASK_STATUS_SLUG
}
