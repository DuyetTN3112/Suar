export type SearchShell = 'app' | 'organization' | 'project' | 'admin'

export function searchShellFromPath(pathname: string): SearchShell {
  if (pathname.startsWith('/admin/')) {
    return 'admin'
  }
  if (pathname.startsWith('/org/')) {
    return 'organization'
  }
  if (/^\/projects\/[^/]+(?:\/|$)/.test(pathname)) {
    return 'project'
  }
  return 'app'
}

export function searchPageBaseUrl(shell: SearchShell, projectId: string | null = null): string {
  switch (shell) {
    case 'organization':
      return '/org/search'
    case 'project':
      return projectId ? `/projects/${encodeURIComponent(projectId)}/search` : '/search'
    case 'admin':
      return '/admin/search'
    case 'app':
    default:
      return '/search'
  }
}

export function buildSearchPageUrl(
  shell: SearchShell,
  q: string,
  type: string = 'all',
  field: string | null = null,
  cursor: string | null = null,
  previousCursor: string | null = null,
  projectId: string | null = null
): string {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (type !== 'all') params.set('type', type)
  if (field) params.set('field', field)
  if (cursor) params.set('cursor', cursor)
  if (previousCursor) params.set('previousCursor', previousCursor)
  const queryString = params.toString()
  const baseUrl = searchPageBaseUrl(shell, projectId)
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}
