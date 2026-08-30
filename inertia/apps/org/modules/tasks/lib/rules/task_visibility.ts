export const TASK_VISIBILITY_OPTIONS = [
  {
    value: 'project',
    labelKey: 'task.visibility.options.project.label',
    label: 'Project only',
    descriptionKey: 'task.visibility.options.project.description',
    description: 'Only project members can see and receive this task. It is not listed on the marketplace.',
  },
  {
    value: 'internal',
    labelKey: 'task.visibility.options.internal.label',
    label: 'Entire organization',
    descriptionKey: 'task.visibility.options.internal.description',
    description:
      'The task is not publicly listed on the marketplace. Organization members can apply through the internal opportunity flow; it is not directly assigned.',
  },
  {
    value: 'external',
    labelKey: 'task.visibility.options.external.label',
    label: 'Marketplace',
    descriptionKey: 'task.visibility.options.external.description',
    description:
      'Task appears on the marketplace for people outside the organization. Eligible people apply; it is not directly assigned.',
  },
  {
    value: 'all',
    labelKey: 'task.visibility.options.all.label',
    label: 'Organization + outside contributors via Marketplace',
    descriptionKey: 'task.visibility.options.all.description',
    description:
      'The task opens an organization application route and a Marketplace route for people outside the organization; it is not directly assigned.',
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
    case 'project':
      return translate(t, 'task.visibility.assignment.project', 'Only project members can be assigned directly. There is no marketplace application flow.')
    case 'internal':
      return translate(t, 'task.visibility.assignment.internal', 'Organization members can submit an application through the internal opportunity flow. Direct assignment is unavailable.')
    case 'external':
      return translate(t, 'task.visibility.assignment.external', 'Task is listed on the marketplace. Eligible people go through applications; direct assignment is unavailable.')
    case 'all':
      return translate(t, 'task.visibility.assignment.all', 'Organization members and outside contributors go through applications; direct assignment is unavailable.')
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
    case 'project':
      return translate(t, 'task.visibility.marketplace.project', 'No marketplace listing. The task stays inside the project.')
    case 'internal':
      return translate(t, 'task.visibility.marketplace.internal', 'No public marketplace listing. The task appears in the organization internal opportunity flow.')
    case 'external':
      return translate(t, 'task.visibility.marketplace.external', 'Public marketplace listing is available outside the organization. Eligible people apply through the listing.')
    case 'all':
      return translate(t, 'task.visibility.marketplace.all', 'A public Marketplace listing and internal application flow are available; direct assignment is unavailable.')
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
