import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

async function seedUser(page: Page): Promise<string> {
  await page.goto('/marketplace/tasks')
  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  const response = await page.request.post(
    `${BASE_URL}/api/testing/seed-marketplace-application-flow`,
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrfToken ?? '',
      },
      data: { timestamp: Date.now(), nonce: Math.random().toString(36).slice(2, 10), withApplication: false },
    }
  )

  expect(response.ok(), await response.text()).toBe(true)
  const payload = (await response.json()) as { data?: { ownerEmail?: string } }
  if (!payload.data?.ownerEmail) throw new Error('Accessibility seed returned no owner email')
  return payload.data.ownerEmail
}

async function expectAccessible(page: Page, label: string, selector: string): Promise<void> {
  const results = await new AxeBuilder({ page }).include(selector).analyze()
  const serious = results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))
  expect(serious, `${label} has serious accessibility violations`).toEqual([])
}

test.describe('Filter/Search/Taxonomy — runtime accessibility', () => {
  test('marketplace filters have no critical or serious axe violations', async ({ page }) => {
    const email = await seedUser(page)
    await login(page, email)
    await page.goto('/marketplace/tasks')
    await expect(page.getByRole('heading', { name: /Task marketplace|Chợ việc làm/i })).toBeVisible()
    await expectAccessible(page, 'Marketplace filters', '.marketplace-page')
  })

  test('Search Center has no critical or serious axe violations', async ({ page }) => {
    const email = await seedUser(page)
    await login(page, email)
    await page.goto('/search')
    await expect(page.getByRole('heading', { name: /Search Center|Trung tâm tìm kiếm/i })).toBeVisible()
    await expectAccessible(page, 'Search Center', 'main')
  })
})
