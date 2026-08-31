import { test, expect } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const ADMIN_EMAIL = 'td6622i@gre.ac.uk'
const REGULAR_EMAIL = 'tranngocduyet31@gmail.com'

test.describe('Admin Search Projections role-play', () => {
  test('system admin can inspect the real page and unsupported actions stay disabled', async ({ page }) => {
    await login(page, ADMIN_EMAIL, { systemRole: 'superadmin' })

    const response = await page.goto('/admin/search-projections')
    expect(response?.status(), 'admin Search Projections page must render').toBe(200)
    await page.waitForLoadState('networkidle')

    const surface = page.locator('section[aria-labelledby="search-projections-title"]')
    await expect(surface).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Search projection generations' })).toBeVisible()
    await expect(page.getByRole('table', { name: 'Search projection generations' })).toBeVisible()

    // The current page is backed by the real inventory adapter. It must not
    // manufacture lifecycle/completeness evidence that the adapter cannot provide.
    const rowCount = await page.getByRole('row').count()
    if (rowCount > 1) {
      await expect(page.getByText('Awaiting completeness evidence', { exact: true }).first()).toBeVisible()
    }

    // Reconcile is wired at the HTTP boundary but has no browser mutation control
    // until the UI has a safe target/confirmation flow. Rebuild and abort remain
    // unsupported. The browser must expose those gaps as disabled controls.
    const reconcile = page.getByRole('button', { name: 'Reconcile projection state' })
    await expect(reconcile).toBeVisible()
    await expect(reconcile).toBeDisabled()

    for (const name of ['Rebuild projection', 'Abort rebuild']) {
      const buttons = page.getByRole('button', { name })
      for (let index = 0; index < await buttons.count(); index += 1) {
        await expect(buttons.nth(index)).toBeDisabled()
      }
    }

    // Accessibility assertions cover the rendered landmark, table semantics,
    // live status, row names, and keyboard-reachable named controls.
    await expect(surface).toHaveAttribute('aria-labelledby', 'search-projections-title')
    await expect(page.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    const rows = page.getByRole('row')
    // The header row is intentionally a column-header row and does not need a
    // data-row label; every generation row must remain individually named.
    for (let index = 1; index < await rows.count(); index += 1) {
      await expect(rows.nth(index)).toHaveAttribute('aria-label', /\S+/)
    }

    const namedButtons = surface.getByRole('button')
    for (let index = 0; index < await namedButtons.count(); index += 1) {
      await expect(namedButtons.nth(index)).toHaveAccessibleName(/.+/)
    }
    // Disabled controls are intentionally removed from the keyboard focus order.
    await expect(reconcile).not.toBeFocused()
  })

  test('authenticated non-admin cannot open the Search Projections admin page', async ({ page }) => {
    await login(page, REGULAR_EMAIL, { systemRole: 'registered_user' })

    await page.goto('/admin/search-projections')
    await page.waitForLoadState('domcontentloaded')

    // The existing system-admin middleware sends an authenticated non-admin
    // back to the organization workspace rather than to login.
    await expect(page).toHaveURL(/\/org(?:$|\/)/)
    await expect(page.getByRole('heading', { name: 'Search projection generations' })).toHaveCount(0)
  })
})
