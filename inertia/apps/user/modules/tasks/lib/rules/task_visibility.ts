export const TASK_VISIBILITY_OPTIONS = [
  {
    value: 'internal',
    labelKey: 'task.visibility.options.internal.label',
    label: 'Organization only',
    descriptionKey: 'task.visibility.options.internal.description',
    description:
      'No marketplace listing. Anyone in the current organization can be assigned directly, including members outside the project.',
  },
  {
    value: 'external',
    labelKey: 'task.visibility.options.external.label',
    label: 'Marketplace',
    descriptionKey: 'task.visibility.options.external.description',
    description:
      'Task appears on the marketplace for people outside the organization. Organization members can still be assigned directly.',
  },
  {
    value: 'all',
    labelKey: 'task.visibility.options.all.label',
    label: 'Hybrid: internal + marketplace',
    descriptionKey: 'task.visibility.options.all.description',
    description:
      'Current runtime is close to Marketplace: it remains public outside the organization and still allows internal assignment. The main difference is the hybrid operating label.',
  },
] as const

export type TaskVisibilityValue = (typeof TASK_VISIBILITY_OPTIONS)[number]['value']
export type TaskVisibilityTranslator = (
  key: string,
  params?: Record<string, unknown>,
  fallback?: string
) => string

function translate(
  t: TaskVisibilityTranslator | undefined,
  key: string,
  fallback: string
): string {
  return t ? t(key, {}, fallback) : fallback
}

export function getTaskVisibilityLabel(
  value: string | null | undefined,
  t?: TaskVisibilityTranslator
): string {
  const option = TASK_VISIBILITY_OPTIONS.find((entry) => entry.value === value)
  return option
    ? translate(t, option.labelKey, option.label)
    : translate(t, 'task.visibility.unknown', 'Unknown')
}

export function getTaskVisibilityDescription(
  value: string | null | undefined,
  t?: TaskVisibilityTranslator
): string {
  const option = TASK_VISIBILITY_OPTIONS.find((entry) => entry.value === value)
  return option ? translate(t, option.descriptionKey, option.description) : ''
}

export function getTaskVisibilityAssignmentRule(
  value: string | null | undefined,
  t?: TaskVisibilityTranslator
): string {
  if (value === null || value === undefined) {
    return translate(t, 'task.visibility.assignment.unknown', 'No display rule configured.')
  }

  switch (value) {
    case 'internal':
      return translate(t, 'task.visibility.assignment.internal', 'Can directly assign any organization member, including members outside the project. No external organization application flow.')
    case 'external':
      return translate(t, 'task.visibility.assignment.external', 'Task is listed on the marketplace. Organization members can still be assigned directly; outside contributors go through applications.')
    case 'all':
      return translate(t, 'task.visibility.assignment.all', 'Current runtime is close to Marketplace: it is listed publicly and still allows direct assignment to organization members.')
  }

  return translate(t, 'task.visibility.assignment.unknown', 'No display rule configured.')
}

export function getTaskVisibilityMarketplaceRule(
  value: string | null | undefined,
  t?: TaskVisibilityTranslator
): string {
  if (value === null || value === undefined) {
    return translate(t, 'task.visibility.marketplace.unknown', 'No marketplace rule configured.')
  }

  switch (value) {
    case 'internal':
      return translate(t, 'task.visibility.marketplace.internal', 'No marketplace listing, so there is no application flow.')
    case 'external':
      return translate(t, 'task.visibility.marketplace.external', 'Public marketplace listing is available outside the organization. Organization members can still see the task through internal channels or be assigned directly.')
    case 'all':
      return translate(t, 'task.visibility.marketplace.all', 'Also has a public marketplace listing like Marketplace. The current difference is mostly the hybrid mode label, not a separate application scope.')
  }

  return translate(t, 'task.visibility.marketplace.unknown', 'No marketplace rule configured.')
}

export function getProjectVisibilityLabel(
  value: string | null | undefined,
  t?: TaskVisibilityTranslator
): string {
  if (value === null || value === undefined) {
    return translate(t, 'task.visibility.project.unknown', 'Unknown')
  }

  switch (value) {
    case 'public':
      return translate(t, 'task.visibility.project.public', 'Public')
    case 'private':
      return translate(t, 'task.visibility.project.private', 'Private')
    case 'team':
      return translate(t, 'task.visibility.project.team', 'Team')
  }

  return translate(t, 'task.visibility.project.unknown', 'Unknown')
}

export function getOrganizationScopeLabel(t?: TaskVisibilityTranslator): string {
  return translate(
    t,
    'task.visibility.organization_scope',
    'Organization-level public/private scope is not configured. Tasks are always created in the current organization.'
  )
}
