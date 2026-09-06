import { expect, test, type Page, type Response } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

interface SeededSearchContext {
  ownerEmail: string
  sameOrgMemberEmail: string
  sameOrgMemberId: string
  organizationId: string
  timestamp: number
}

async function seedSearchContext(page: Page): Promise<SeededSearchContext> {
  await page.goto('/marketplace/tasks')
  await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).slice(2, 10)
  const response = await page.request.post(
    `${BASE_URL}/api/testing/seed-marketplace-application-flow`,
    {
      headers: {
        'Accept': 'application/json',
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
    data?: {
      ownerEmail?: string
      sameOrgMemberEmail?: string
      sameOrgMemberId?: string
      organizationId?: string
    }
  }
  const data = payload.data
  if (!data?.ownerEmail || !data.sameOrgMemberEmail || !data.sameOrgMemberId || !data.organizationId) {
    throw new Error('Search role-play seed returned incomplete saved-view sharing data')
  }
  return {
    ownerEmail: data.ownerEmail,
    sameOrgMemberEmail: data.sameOrgMemberEmail,
    sameOrgMemberId: data.sameOrgMemberId,
    organizationId: data.organizationId,
    timestamp,
  }
}

async function cleanupSearchContext(page: Page, timestamp: number) {
  await page.request.post(`${BASE_URL}/api/testing/seed-cleanup`, { data: { timestamp } })
}

interface SavedViewRequest {
  name?: string
  contextKey?: string
  criteria?: { context?: string; text?: { value?: string } }
  visibility?: 'private' | 'organization' | 'team'
  organizationId?: string | null
  teamId?: string | null
  grants?: unknown[]
  isPinned?: boolean
  isDefault?: boolean
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

test.describe('Filter/Search/Taxonomy — Saved View role-play', () => {
  test('saves, pins, defaults, duplicates, and exposes organization sharing in the real Search Center', async ({
    page,
  }) => {
    const query = `saved-view-roleplay-${Date.now().toString(36)}`
    const seeded = await seedSearchContext(page)
    await login(page, seeded.ownerEmail)

    const viewName = `RP FST 06 ${Date.now().toString(36)}`
    const description = 'Search Center saved-view browser evidence'
    const serverErrors: string[] = []
    page.on('response', (response) => {
      if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`)
    })

    await page.goto(`/search?q=${encodeURIComponent(query)}`)
    await expect(
      page.getByRole('heading', { name: /Search Center|Trung tâm tìm kiếm/i })
    ).toBeVisible()

    await openSavedViewMenu(page)
    await page.getByRole('button', { name: 'Save Current View' }).click()
    const saveDialog = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('heading', { name: 'Save View' }) })
    await expect(saveDialog).toBeVisible()
    await saveDialog.getByLabel(/View Name/i).fill(viewName)
    await saveDialog.getByLabel('Description').fill(description)

    const createResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/v1/filter-saved-views') &&
        response.request().method() === 'POST'
    )
    await saveDialog.getByRole('button', { name: 'Save View', exact: true }).click()
    const created = await createResponse
    expect(created.status()).toBe(201)
    expect(savedViewRequest(created)).toMatchObject({
      name: viewName,
      contextKey: 'search.blended.global',
      criteria: { context: 'search.blended.global', text: { value: query } },
    })
    await expect(savedViewMenu(page)).toContainText(viewName)

    await openSavedViewMenu(page)
    let viewRow = page.getByRole('menuitem').filter({ hasText: viewName })
    const pinResponse = page.waitForResponse(
      (response) =>
        /\/api\/v1\/filter-saved-views\/[^/]+$/.test(new URL(response.url()).pathname) &&
        response.request().method() === 'PUT'
    )
    await viewRow.getByTitle('Pin view').click()
    const pinned = await pinResponse
    expect(pinned.status()).toBe(200)
    expect(savedViewRequest(pinned)).toMatchObject({ isPinned: true })

    viewRow = page.getByRole('menuitem').filter({ hasText: viewName })
    const defaultResponse = page.waitForResponse(
      (response) =>
        /\/api\/v1\/filter-saved-views\/[^/]+$/.test(new URL(response.url()).pathname) &&
        response.request().method() === 'PUT'
    )
    await viewRow.getByTitle('Set as default view').click()
    const defaulted = await defaultResponse
    expect(defaulted.status()).toBe(200)
    expect(savedViewRequest(defaulted)).toMatchObject({ isPinned: true, isDefault: true })

    viewRow = page.getByRole('menuitem').filter({ hasText: viewName })
    const duplicateResponse = page.waitForResponse(
      (response) =>
        /\/api\/v1\/filter-saved-views\/[^/]+\/duplicate$/.test(new URL(response.url()).pathname) &&
        response.request().method() === 'POST'
    )
    await viewRow.getByTitle('Duplicate view').click()
    const duplicated = await duplicateResponse
    expect(duplicated.status()).toBe(201)
    expect(savedViewRequest(duplicated)).toMatchObject({ name: `${viewName} (Copy)` })
    await expect(savedViewMenu(page)).toContainText(`${viewName} (Copy)`)

    await openSavedViewMenu(page)
    viewRow = page.getByRole('menuitem').filter({ hasText: `${viewName} (Copy)` })
    await expect(viewRow.getByTitle('Share permissions')).toHaveCount(1)
    expect(serverErrors, `Unexpected server errors: ${serverErrors.join(', ')}`).toEqual([])
    await cleanupSearchContext(page, seeded.timestamp)
  })

  test('shares with a clean-session member, recovers an optimistic conflict, and hides access after revoke', async ({
    browser,
    page,
  }) => {
    test.setTimeout(120_000)
    const query = `saved-view-rp-fst-06-${Date.now().toString(36)}`
    const seeded = await seedSearchContext(page)
    const conflictPage = await page.context().newPage()
    const memberContext = await browser.newContext()
    const memberPage = await memberContext.newPage()

    try {
      await login(page, seeded.ownerEmail)
      await page.goto(`/search?q=${encodeURIComponent(query)}`)
      await expect(page.getByRole('heading', { name: /Search Center|Trung tâm tìm kiếm/i })).toBeVisible()

      const viewName = `RP FST 06 share ${Date.now().toString(36)}`
      await openSavedViewMenu(page)
      await page.getByRole('button', { name: 'Save Current View' }).click()
      const saveDialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Save View' }) })
      await saveDialog.getByLabel(/View Name/i).fill(viewName)
      await saveDialog.getByRole('button', { name: 'Save View', exact: true }).click()
      await expect(savedViewMenu(page)).toContainText(viewName)

      await login(conflictPage, seeded.ownerEmail)
      await conflictPage.goto(`/search?q=${encodeURIComponent(query)}`)
      await openSavedViewMenu(conflictPage)
      await expect(conflictPage.getByRole('menuitem').filter({ hasText: viewName })).toBeVisible()

      await openSavedViewMenu(page)
      let viewRow = page.getByRole('menuitem').filter({ hasText: viewName })
      await viewRow.getByTitle('Share permissions').click()
      const shareDialog = page.getByRole('dialog').filter({ hasText: 'Share Saved View' })
      await shareDialog.getByRole('radio', { name: /Organization/i }).click()
      await shareDialog.getByRole('radio', { name: /Current organization/i }).click()
      const firstShareResponse = page.waitForResponse(
        (response) => response.url().endsWith('/share') && response.request().method() === 'POST'
      )
      await shareDialog.getByRole('button', { name: 'Save Permissions' }).click()
      const firstShare = await firstShareResponse
      expect(firstShare.status()).toBe(200)
      expect(savedViewRequest(firstShare)).toMatchObject({
        visibility: 'organization',
        organizationId: seeded.organizationId,
        grants: [{ target: { type: 'organization', id: seeded.organizationId }, read: true, edit: false }],
      })

      await openSavedViewMenu(conflictPage)
      viewRow = conflictPage.getByRole('menuitem').filter({ hasText: viewName })
      await viewRow.getByTitle('Share permissions').click()
      const conflictDialog = conflictPage.getByRole('dialog').filter({ hasText: 'Share Saved View' })
      await conflictDialog.getByRole('radio', { name: /Organization/i }).click()
      await conflictDialog.getByRole('radio', { name: /Current organization/i }).click()
      const conflictResponse = conflictPage.waitForResponse(
        (response) => response.url().endsWith('/share') && response.request().method() === 'POST'
      )
      await conflictDialog.getByRole('button', { name: 'Save Permissions' }).click()
      const conflict = await conflictResponse
      expect(conflict.status()).toBe(409)
      await expect(conflictDialog.getByRole('alert')).toContainText(/changed elsewhere/i)
      await conflictDialog.getByRole('button', { name: 'Reload latest permissions' }).click()
      const reapplyResponse = conflictPage.waitForResponse(
        (response) => response.url().endsWith('/share') && response.request().method() === 'POST'
      )
      await conflictDialog.getByRole('button', { name: 'Reapply my permissions' }).click()
      const reapplied = await reapplyResponse
      expect(reapplied.status()).toBe(200)

      await login(memberPage, seeded.sameOrgMemberEmail)
      await memberPage.goto(`/search?q=${encodeURIComponent(query)}`)
      await openSavedViewMenu(memberPage)
      const memberViewRow = memberPage.getByRole('menuitem').filter({ hasText: viewName })
      await expect(memberViewRow).toBeVisible()
      await expect(memberViewRow.getByTitle('Share permissions')).toHaveCount(0)
      await expect(memberViewRow.getByTitle('Pin view')).toHaveCount(0)
      await expect(memberViewRow.getByTitle('Set as default view')).toHaveCount(0)
      await expect(memberViewRow.getByTitle('Delete view')).toHaveCount(0)

      const revokeResponse = await memberPage.request.post(
        `${BASE_URL}/api/testing/revoke-saved-view-roleplay-membership`,
        { data: { organizationId: seeded.organizationId, userId: seeded.sameOrgMemberId, timestamp: seeded.timestamp } }
      )
      expect(revokeResponse.ok()).toBe(true)
      expect(await revokeResponse.json()).toMatchObject({ data: { acknowledged: true } })

      await memberPage.goto('/search')
      await openSavedViewMenu(memberPage)
      await expect(memberPage.getByRole('menuitem').filter({ hasText: viewName })).toHaveCount(0)
      await expect(memberPage.locator('body')).not.toContainText(viewName)
      await expect(memberPage.locator('body')).not.toContainText(query)
    } finally {
      await memberContext.close()
      await conflictPage.close()
      await cleanupSearchContext(page, seeded.timestamp)
    }
  })
})
