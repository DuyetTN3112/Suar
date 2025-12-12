import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const navBarSources = [
  'inertia/apps/user/shared/components/layout/nav_bar.svelte',
  'inertia/apps/org/shared/components/layout/nav_bar.svelte',
  'inertia/apps/admin/shared/components/layout/nav_bar.svelte',
] as const

describe('workspace nav bar source', () => {
  it('keeps the mobile sidebar trigger accessible across user, org, and admin shells', () => {
    for (const sourcePath of navBarSources) {
      const source = readFileSync(resolve(process.cwd(), sourcePath), 'utf8')

      expect(source).toContain('lg:hidden')
      expect(source).toContain("aria-label={t('common.open_navigation', {}, 'Open navigation')}")
      expect(source).toContain('onclick={() => onMenuClick?.()}')
    }
  })

  it('keeps theme selection in a navbar dropdown across user, org, and admin shells', () => {
    for (const sourcePath of navBarSources) {
      const source = readFileSync(resolve(process.cwd(), sourcePath), 'utf8')

      expect(source).toContain("import DropdownMenu from")
      expect(source).toContain("import DropdownMenuContent from")
      expect(source).toContain("import DropdownMenuItem from")
      expect(source).toContain("import DropdownMenuTrigger from")
      expect(source).toContain('THEME_OPTIONS')
      expect(source).toContain('setThemePreference')
      expect(source).not.toContain('onclick={toggleTheme}')
    }
  })
})
