import { describe, expect, it } from 'vitest'

import { mainOverviewSection } from '@/apps/user/shared/components/navigation/main_sections/overview'
import { mainSettingsSection } from '@/apps/user/shared/components/navigation/main_sections/settings'
import { FRONTEND_ROUTES } from '@/apps/user/shared/constants'
import { SETTINGS_CARDS } from '@/apps/user/shared/constants/settings'

describe('profile and settings navigation', () => {
  it('exposes the capability profile as a direct main sidebar item', () => {
    expect(mainOverviewSection.items).toContainEqual(
      expect.objectContaining({
        title: 'Capability profile',
        url: FRONTEND_ROUTES.PROFILE,
      })
    )
  })

  it('exposes my invitations as a direct main sidebar item', () => {
    expect(mainOverviewSection.items).toContainEqual(
      expect.objectContaining({
        title: 'Invitations',
        url: '/profile/invitations',
      })
    )
  })

  it('keeps profile-edit settings inside the account settings surface', () => {
    expect(mainSettingsSection.items).not.toContainEqual(
      expect.objectContaining({
        url: FRONTEND_ROUTES.SETTINGS_PROFILE,
      })
    )

    expect(SETTINGS_CARDS).not.toContainEqual(
      expect.objectContaining({
        href: FRONTEND_ROUTES.SETTINGS_PROFILE,
      })
    )

    expect(mainSettingsSection.items).toContainEqual(
      expect.objectContaining({
        title: 'Account & personal information',
        url: FRONTEND_ROUTES.SETTINGS_ACCOUNT,
      })
    )

    expect(SETTINGS_CARDS).toContainEqual(
      expect.objectContaining({
        titleFallback: 'Account & personal information',
        href: FRONTEND_ROUTES.SETTINGS_ACCOUNT,
      })
    )
  })

  it('does not expose display settings as a user-facing settings surface', () => {
    expect(mainSettingsSection.items).not.toContainEqual(
      expect.objectContaining({
        url: '/settings/display',
      })
    )

    expect(SETTINGS_CARDS).not.toContainEqual(
      expect.objectContaining({
        href: '/settings/display',
      })
    )
  })

  it('keeps notification settings out of the main sidebar', () => {
    expect(mainSettingsSection.items).not.toContainEqual(
      expect.objectContaining({
        url: FRONTEND_ROUTES.SETTINGS_NOTIFICATIONS,
      })
    )
  })

  it('keeps appearance settings out of user-facing settings navigation', () => {
    expect(mainSettingsSection.items).not.toContainEqual(
      expect.objectContaining({
        url: '/settings/appearance',
      })
    )

    expect(SETTINGS_CARDS).not.toContainEqual(
      expect.objectContaining({
        href: '/settings/appearance',
      })
    )
  })
})
