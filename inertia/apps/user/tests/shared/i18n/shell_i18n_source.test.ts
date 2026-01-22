import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const navBarSources = [
  'inertia/apps/user/shared/components/layout/nav_bar.svelte',
  'inertia/apps/org/shared/components/layout/nav_bar.svelte',
  'inertia/apps/admin/shared/components/layout/nav_bar.svelte',
] as const

const controlSidebarSources = [
  'inertia/apps/user/shared/components/layout/control_sidebar.svelte',
  'inertia/apps/org/shared/components/layout/control_sidebar.svelte',
] as const

const controlSidebarNavigationSources = [
  'inertia/apps/user/shared/components/layout/control_sidebar_navigation.svelte',
  'inertia/apps/org/shared/components/layout/control_sidebar_navigation.svelte',
  'inertia/apps/admin/shared/components/layout/control_sidebar_navigation.svelte',
] as const

const settingsIndexSources = [
  'inertia/apps/user/modules/settings/index.svelte',
  'inertia/apps/org/modules/settings/index.svelte',
] as const

const accountProfileSources = [
  {
    sourcePath: 'inertia/apps/user/modules/settings/account.svelte',
    requiredKeys: [
      "t('settings.account_personal_title'",
      "t('settings.personal_information_title'",
      "t('settings.bio_placeholder'",
      "t('settings.add_url'",
    ],
  },
  {
    sourcePath: 'inertia/apps/org/modules/settings/account.svelte',
    requiredKeys: [
      "t('settings.account_title'",
      "t('settings.login_identity_title'",
      "t('settings.no_email'",
      "t('settings.account_package_title'",
      "t('settings.related_pages_title'",
    ],
  },
  {
    sourcePath: 'inertia/apps/org/modules/settings/profile.svelte',
    requiredKeys: [
      "t('settings.profile_title'",
      "t('settings.personal_information_title'",
      "t('settings.bio_placeholder'",
      "t('settings.add_url'",
    ],
  },
] as const

const settingsTabSources = [
  'inertia/apps/user/modules/settings/account_tab.svelte',
  'inertia/apps/org/modules/settings/account_tab.svelte',
  'inertia/apps/user/modules/settings/profile_tab.svelte',
  'inertia/apps/org/modules/settings/profile_tab.svelte',
  'inertia/apps/user/modules/settings/notifications_tab.svelte',
  'inertia/apps/org/modules/settings/notifications_tab.svelte',
] as const

const notificationSources = [
  'inertia/apps/user/modules/settings/notifications.svelte',
  'inertia/apps/org/modules/settings/notifications.svelte',
] as const

function readSource(sourcePath: string): string {
  return readFileSync(resolve(process.cwd(), sourcePath), 'utf8')
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readSource(path)) as Record<string, unknown>
}

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return prefix ? [prefix] : []
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key
    return flattenKeys(child, nextPrefix)
  })
}

describe('shell i18n source guard', () => {
  it('keeps English and Vietnamese common shell resources in sync', () => {
    expect(flattenKeys(readJson('resources/lang/en/common.json')).sort()).toEqual(
      flattenKeys(readJson('resources/lang/vi/common.json')).sort()
    )
  })

  it('routes nav bar labels through translations across all workspace shells', () => {
    for (const sourcePath of navBarSources) {
      const source = readSource(sourcePath)

      expect(source).toContain("t('common.search_everything'")
      expect(source).toContain("t('common.logout'")

      if (sourcePath.includes('/admin/')) {
        expect(source).not.toContain("t('common.profile'")
        expect(source).not.toContain("t('common.account_settings'")
      } else {
        expect(source).toContain("t('common.profile'")
        expect(source).toContain("t('common.account_settings'")
      }
    }
  })

  it('preserves the current query and hash when changing language from a workspace shell', () => {
    for (const sourcePath of navBarSources) {
      const source = readSource(sourcePath)

      expect(source).toContain('new URL(window.location.href)')
      expect(source).toContain("currentUrl.searchParams.set('locale', nextLocale)")
      expect(source).toContain(
        'router.visit(`${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`'
      )
      expect(source).not.toContain('router.visit(window.location.pathname')
    }
  })

  it('routes sidebar navigation labels through title keys across all workspace shells', () => {
    for (const sourcePath of controlSidebarNavigationSources) {
      const source = readSource(sourcePath)

      expect(source).toContain('useTranslation()')
      expect(source).toContain('function getNavLabel')
      expect(source).toContain('t(item.titleKey')
      expect(source).toContain('{getNavLabel(navGroup)}')
      expect(source).not.toContain('{navGroup.title}')
      expect(source).not.toContain('{item.title}</span>')
      expect(source).not.toContain('{subItem.title}</span>')
    }
  })

  it('routes control sidebar switcher labels through translations', () => {
    for (const sourcePath of controlSidebarSources) {
      const source = readSource(sourcePath)

      expect(source).toContain("t('common.switching'")
      expect(source).toContain("t('common.project_prefix'")
      expect(source).toContain("t('common.no_projects'")
      expect(source).toContain("t('common.view_all_organizations'")
      expect(source).toContain('formatRoleLabel(org.org_role, t)')
    }
  })

  it('routes settings index cards through translations', () => {
    for (const sourcePath of settingsIndexSources) {
      const source = readSource(sourcePath)

      expect(source).toContain("t('settings.index_title'")
      expect(source).toContain('t(item.titleKey')
    }
  })

  it('routes account/profile settings copy through translations', () => {
    for (const { sourcePath, requiredKeys } of accountProfileSources) {
      const source = readSource(sourcePath)

      for (const key of requiredKeys) {
        expect(source).toContain(key)
      }
    }
  })

  it('routes settings tabs through translations', () => {
    for (const sourcePath of settingsTabSources) {
      const source = readSource(sourcePath)

      expect(source).toContain("t('settings.save_changes'")
      expect(source).toContain("t('settings.saving'")
    }
  })

  it('routes notification settings pages through translations', () => {
    for (const sourcePath of notificationSources) {
      const source = readSource(sourcePath)

      expect(source).toContain("t('settings.notifications_title'")
      expect(source).toContain("t('settings.notification_options'")
      expect(source).toContain("t('settings.notification_empty'")
    }
  })
})
