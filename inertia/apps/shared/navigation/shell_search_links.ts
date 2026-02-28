export type SearchShell = 'app' | 'organization' | 'admin'

export function searchShellFromPath(pathname: string): SearchShell {
  if (pathname.startsWith('/admin/')) {
    return 'admin'
  }
  if (pathname.startsWith('/org/')) {
    return 'organization'
  }
  return 'app'
}

export function searchPageBaseUrl(shell: SearchShell): string {
  switch (shell) {
    case 'organization':
      return '/org/search'
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
  field: string | null = null
): string {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (type !== 'all') params.set('type', type)
  if (field) params.set('field', field)
  const queryString = params.toString()
  const baseUrl = searchPageBaseUrl(shell)
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}
