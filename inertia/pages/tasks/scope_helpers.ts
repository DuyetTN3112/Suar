export function buildProjectScopeFilters(
  filters: Record<string, string | number | null | undefined>,
  projectId: string
): Record<string, string | number | null | undefined> {
  const nextFilters: Record<string, string | number | null | undefined> = {
    ...filters,
    page: 1,
    project_id: projectId,
  }

  return nextFilters
}
