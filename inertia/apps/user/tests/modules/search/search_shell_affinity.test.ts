import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('search shell affinity', () => {
  it('routes org/admin search and nav bars through shell-aware URLs', () => {
    const orgRoutes = read('start/routes/organizations_current.ts')
    const adminRoutes = read('start/routes/admin.ts')

    expect(orgRoutes).toContain(".get('/search', [SearchPageController, 'handle'])")
    expect(adminRoutes).toContain(".get('/search', [SearchPageController, 'handle'])")

    const userNav = read('inertia/apps/user/shared/components/layout/nav_bar.svelte')
    const orgNav = read('inertia/apps/org/shared/components/layout/nav_bar.svelte')
    const adminNav = read('inertia/apps/admin/shared/components/layout/nav_bar.svelte')

    expect(userNav).toContain("buildSearchPageUrl('app', value)")
    expect(orgNav).toContain("buildSearchPageUrl('organization', value)")
    expect(adminNav).toContain("buildSearchPageUrl('admin', value)")
    expect(userNav).not.toContain("router.visit(value ? `/search")
    expect(orgNav).not.toContain("router.visit(value ? `/search")
    expect(adminNav).not.toContain("router.visit(value ? `/search")
  })
})
