export function buildProjectScopeFilters(
  filters: Record<string, string | number | null | undefined>,
  projectId: string
): Record<string, string | number | null | undefined> {
  const normalizedProjectId = projectId === '__all__' ? undefined : projectId

  const nextFilters: Record<string, string | number | null | undefined> = {
    ...filters,
    page: 1,
  }

  if (normalizedProjectId) {
    nextFilters.project_id = normalizedProjectId
  } else {
    delete nextFilters.project_id
  }

  return nextFilters
}
