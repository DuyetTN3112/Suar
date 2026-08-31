import { expect, test, type Page, type Response } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const ADMIN_EMAIL = 'td6622i@gre.ac.uk'
const IMPOSSIBLE_STALE_REVISION = '9007199254740991'
const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

interface TaxonomyRepairSeed {
  ownerEmail: string
  organizationId: string
  timestamp: number
  nonce: string
}

async function seedTaxonomyRepairContext(page: Page): Promise<TaxonomyRepairSeed> {
  await page.goto('/marketplace/tasks')
  await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).slice(2, 10)
  const response = await page.request.post(
    `${BASE_URL}/api/testing/seed-marketplace-application-flow`,
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrfToken ?? '',
      },
      data: { timestamp, nonce, withApplication: false },
    }
  )
  const body = await response.text()
  expect(response.ok(), body).toBe(true)
  const payload = JSON.parse(body) as {
    data?: { ownerEmail?: string; organizationId?: string }
  }
  if (!payload.data?.ownerEmail || !payload.data.organizationId) {
    throw new Error('Taxonomy repair seed returned incomplete owner context')
  }
  return { ownerEmail: payload.data.ownerEmail, organizationId: payload.data.organizationId, timestamp, nonce }
}

async function cleanupTaxonomyRepairContext(page: Page, timestamp: number) {
  await page.request.post(`${BASE_URL}/api/testing/seed-cleanup`, { data: { timestamp } })
}

interface SavedViewRequest {
  name?: string
  contextKey?: string
  criteria?: {
    context?: string
    text?: { value?: string }
    filter?: { value?: { values?: string[] } }
  }
}

function savedViewRequest(response: Response): SavedViewRequest {
  const postData = response.request().postData()
  if (!postData) throw new Error(`Saved-view request ${response.url()} had no JSON body`)
  return JSON.parse(postData) as SavedViewRequest
}

function savedViewMenu(page: Page) {
  return page.getByRole('button', { name: 'Saved views menu' })
}

async function openSavedViewMenu(page: Page) {
  const menu = page.getByRole('menu')
  if (!(await menu.isVisible().catch(() => false))) {
    await page.keyboard.press('Escape').catch(() => undefined)
    await savedViewMenu(page).evaluate((button) => (button as HTMLButtonElement).click())
  }
  await expect(menu).toBeVisible()
}

/**
 * The owner journey uses the real task Discovery context for saved views and alerts. The
 * test-only transition endpoint is only a deterministic prerequisite for the external taxonomy
 * split; the admin stale-version boundary remains covered by the second test below.
 */
test.describe('Filter/Search/Taxonomy — RP-FST-07 taxonomy split repair role-play', () => {
  test('original owner repairs, revalidates, and explicitly resumes a taxonomy-paused alert', async ({ page }) => {
    test.setTimeout(120_000)
    const seeded = await seedTaxonomyRepairContext(page)

    try {
      await login(page, seeded.ownerEmail)
      await page.goto('/search?type=task')
      await expect(page.getByRole('heading', { name: /Search Center|Trung tâm tìm kiếm/i })).toBeVisible()

      const viewName = `RP FST 07 ${Date.now().toString(36)}`
      await openSavedViewMenu(page)
      await page.getByRole('button', { name: 'Save Current View' }).click()
      const saveDialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Save View' }) })
      await expect(saveDialog).toBeVisible()
      await saveDialog.getByLabel(/View Name/i).fill(viewName)

      const createResponse = page.waitForResponse(
        (response) => response.url().endsWith('/api/v1/filter-saved-views') && response.request().method() === 'POST'
      )
      await saveDialog.getByRole('button', { name: 'Save View', exact: true }).click()
      const created = await createResponse
      expect(created.status()).toBe(201)
      expect(savedViewRequest(created)).toMatchObject({
        name: viewName,
        contextKey: 'tasks.discovery.member',
        criteria: { context: 'tasks.discovery.member' },
      })
      const createdBody = (await created.json()) as { view?: { id?: string } }
      const viewId = createdBody.view?.id
      if (!viewId) throw new Error('Saved view response did not include a view id')
      await expect(savedViewMenu(page)).toContainText(viewName)
      await expect(page.getByRole('button', { name: 'Subscribe to alerts' })).toBeVisible()

      await page.getByRole('button', { name: 'Subscribe to alerts' }).click()
      const alertDialog = page.getByRole('dialog').filter({ hasText: 'Subscribe to alerts' })
      await expect(alertDialog).toBeVisible()
      const createAlertResponse = page.waitForResponse(
        (response) => response.url().endsWith(`/api/v1/filter-saved-views/${viewId}/alert`) && response.request().method() === 'POST'
      )
      await alertDialog.getByRole('button', { name: 'Subscribe to alerts', exact: true }).click()
      const createdAlert = await createAlertResponse
      expect(createdAlert.status()).toBe(201)

      const transitionResponse = await page.request.post(
        `${BASE_URL}/api/testing/seed-taxonomy-repair-roleplay`,
        { data: { timestamp: seeded.timestamp, nonce: seeded.nonce, viewId } }
      )
      const transitionBody = (await transitionResponse.json()) as {
        data: { oldTermId: string; replacementTermId: string }
      }
      expect(transitionResponse.ok(), JSON.stringify(transitionBody)).toBe(true)

      await page.reload()
      const repairDialog = page.getByRole('dialog').filter({ hasText: 'Saved View Requires Repair' })
      await expect(repairDialog).toBeVisible()
      const oldTermId = transitionBody.data.oldTermId
      const replacementTermId = transitionBody.data.replacementTermId
      await repairDialog.getByLabel(`Replace ${oldTermId} with`).fill(replacementTermId)

      const repairResponse = page.waitForResponse(
        (response) => response.url().endsWith(`/api/v1/filter-saved-views/${viewId}`) && response.request().method() === 'PUT'
      )
      await repairDialog.getByRole('button', { name: 'Repair & Revalidate View' }).click()
      const repaired = await repairResponse
      expect(repaired.status()).toBe(200)
      expect(savedViewRequest(repaired)).toMatchObject({
        criteria: { filter: { value: { values: [replacementTermId] } } },
      })
      await expect(repairDialog).toContainText('Saved view revalidated')

      const resumeResponse = page.waitForResponse(
        (response) => response.url().endsWith(`/api/v1/filter-saved-views/${viewId}/alert`) && response.request().method() === 'PUT'
      )
      await repairDialog.getByRole('button', { name: 'Resume paused alert' }).click()
      const resumed = await resumeResponse
      expect(resumed.status()).toBe(200)
      await expect(repairDialog).toContainText('explicitly resumed')

      const finalViewResponse = await page.request.get(`${BASE_URL}/api/v1/filter-saved-views/${viewId}`)
      expect(finalViewResponse.status()).toBe(200)
      const finalViewBody = (await finalViewResponse.json()) as {
        view: { migrationState: string; criteria: { filter?: { value?: { values?: string[] } } } }
      }
      expect(finalViewBody.view.migrationState).toBe('current')
      expect(finalViewBody.view.criteria.filter?.value?.values).toEqual([replacementTermId])

      const finalAlertResponse = await page.request.get(`${BASE_URL}/api/v1/filter-saved-views/${viewId}/alert`)
      expect(finalAlertResponse.status()).toBe(200)
      const finalAlertBody = (await finalAlertResponse.json()) as { alert: { status: string; pauseReason: string | null } }
      expect(finalAlertBody.alert).toMatchObject({ status: 'active', pauseReason: null })
    } finally {
      await cleanupTaxonomyRepairContext(page, seeded.timestamp)
    }
  })

  test('system admin submits a split proposal and the live API rejects stale version evidence', async ({ page }) => {
    await login(page, ADMIN_EMAIL, { systemRole: 'superadmin' })

    const response = await page.goto('/admin/taxonomy/governance')
    expect(response?.status(), 'taxonomy governance page must render for a system admin').toBe(200)

    await expect(page.getByTestId('taxonomy_governance')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Taxonomy governance' })).toBeVisible()

    await page.getByLabel('Expected taxonomy version').fill(IMPOSSIBLE_STALE_REVISION)
    await page.getByLabel('Change kind').selectOption('split')
    await page.getByLabel('From term ID').fill('rp-fst-07-legacy-skill')
    await page.getByLabel('Replacement term IDs').fill('rp-fst-07-skill-c, rp-fst-07-skill-d')

    const previewResponse = page.waitForResponse(
      (candidate) =>
        candidate.request().method() === 'POST' &&
        candidate.url().endsWith('/api/admin/taxonomy/governance/preview')
    )
    await page.getByRole('button', { name: 'Preview change' }).click()

    const preview = await previewResponse
    expect(preview.status(), await preview.text()).toBe(409)
    await expect(page.getByRole('alert')).toContainText('stale_taxonomy_migration_plan')
    await expect(page.getByRole('button', { name: 'Apply governed plan' })).toHaveCount(0)
  })

})
