import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { buildSearchPageUrl } from '@/apps/shared/navigation/shell_search_links'

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('search shell affinity', () => {
  it('routes project, org, and admin search through shell-aware URLs', () => {
    const orgRoutes = read('start/routes/organizations_current.ts')
    const adminRoutes = read('start/routes/admin.ts')
    const projectRoutes = read('start/routes/projects.ts')

    expect(orgRoutes).toContain(".get('/search', [SearchPageController, 'handle'])")
    expect(adminRoutes).toContain(".get('/search', [SearchPageController, 'handle'])")
    expect(projectRoutes).toContain(".get('/projects/:projectId/search', [SearchPageController, 'handle'])")

    const userNav = read('inertia/apps/user/shared/components/layout/nav_bar.svelte')
    const orgNav = read('inertia/apps/org/shared/components/layout/nav_bar.svelte')
    const adminNav = read('inertia/apps/admin/shared/components/layout/nav_bar.svelte')

    expect(userNav).toContain("workspaceMode === 'project' ? 'project' : 'app'")
    expect(orgNav).toContain("buildSearchPageUrl('organization', value)")
    expect(adminNav).toContain("buildSearchPageUrl('admin', value)")
    expect(userNav).not.toContain('router.visit(value ? `/search')
    expect(orgNav).not.toContain('router.visit(value ? `/search')
    expect(adminNav).not.toContain('router.visit(value ? `/search')
  })

  it('keeps an opaque Discovery cursor in the shell-aware URL', () => {
    expect(buildSearchPageUrl('app', 'checkout', 'task', null, 'opaque-page-2')).toBe(
      '/search?q=checkout&type=task&cursor=opaque-page-2'
    )
    expect(buildSearchPageUrl('organization', '', 'task', null, 'opaque-page-2')).toBe(
      '/org/search?type=task&cursor=opaque-page-2'
    )
    expect(
      buildSearchPageUrl('app', 'checkout', 'task', null, 'opaque-page-3', 'opaque-page-2')
    ).toBe('/search?q=checkout&type=task&cursor=opaque-page-3&previousCursor=opaque-page-2')
    expect(buildSearchPageUrl('project', 'checkout', 'task', null, null, null, 'project-1')).toBe(
      '/projects/project-1/search?q=checkout&type=task'
    )
  })
})
