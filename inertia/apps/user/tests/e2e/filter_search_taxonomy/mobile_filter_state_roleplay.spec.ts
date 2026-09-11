import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

interface SeededMarketplaceContext {
  ownerEmail: string
}

async function seedMarketplaceUser(page: Page): Promise<SeededMarketplaceContext> {
  await page.goto('/marketplace/tasks')
  await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()

  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  const response = await page.request.post(
    `${BASE_URL}/api/testing/seed-marketplace-application-flow`,
    {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrfToken ?? '',
      },
      data: {
        timestamp: Date.now(),
        nonce: Math.random().toString(36).slice(2, 10),
        withApplication: false,
      },
    }
  )

  const body = await response.text()
  expect(response.ok(), body).toBe(true)
  const payload = JSON.parse(body) as { data?: Partial<SeededMarketplaceContext> }
  const ownerEmail = payload.data?.ownerEmail
  if (!ownerEmail) throw new Error('RP-FST-05 seed returned no ACT-USER email')

  return { ownerEmail }
}

function filterDrawer(page: Page) {
  return page.getByRole('dialog', { name: /Marketplace filters|Bộ lọc marketplace/i })
}

async function openFilterDrawer(page: Page) {
  const opener = page.getByRole('button', { name: /More filters|Thêm bộ lọc/i })
  await expect(opener).toBeVisible()
  await opener.focus()
  await opener.click()

  const drawer = filterDrawer(page)
  await expect(drawer).toBeVisible()
  await expect(drawer).toHaveAttribute('aria-modal', 'true')
  return { drawer, opener }
}

test.describe('Filter/Search/Taxonomy — RP-FST-05 mobile filter state', () => {
  test('preserves committed criteria while Back and Cancel discard a dirty draft', async ({
    page,
  }) => {
    const degradedEvidence = [
      'Not executed: this Marketplace surface has no approved testing endpoint or provider switch that produces a real degraded/offline response.',
      'This role-play intentionally does not intercept requests, call setOffline, abort requests, or fabricate responses.',
      'The FilterDrawer exposes an apply-error retry UI, but exercising it requires a real external failure path not available in this scoped run.',
    ].join('\n')
    test.info().annotations.push({
      type: 'evidence-gap',
      description: degradedEvidence,
    })
    await test.info().attach('rp-fst-05-degraded-network-evidence-gap.txt', {
      body: degradedEvidence,
      contentType: 'text/plain',
    })

    const seeded = await seedMarketplaceUser(page)
    await login(page, seeded.ownerEmail)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/marketplace/tasks')
    await expect(
      page.getByRole('heading', { name: /Task marketplace|Chợ việc làm/i })
    ).toBeVisible()

    const committedBeforeApply = page.url()
    const firstOpen = await openFilterDrawer(page)
    await expect(firstOpen.drawer.getByLabel(/Difficulty|Độ khó/i)).toHaveValue('')
    await expect(
      firstOpen.drawer.getByText(/No unapplied changes|Không có thay đổi chưa áp dụng/i)
    ).toBeVisible()

    await firstOpen.drawer.getByLabel(/Difficulty|Độ khó/i).selectOption('easy')
    await expect(
      firstOpen.drawer.getByText(/Unapplied changes|Thay đổi chưa áp dụng/i)
    ).toBeVisible()
    await firstOpen.drawer.getByLabel(/Apply filter changes/i).click()

    await expect(page).toHaveURL(/difficulty=easy/)
    expect(page.url()).not.toBe(committedBeforeApply)
    const committedUrl = page.url()

    const committedOpen = await openFilterDrawer(page)
    await expect(committedOpen.drawer.getByLabel(/Difficulty|Độ khó/i)).toHaveValue('easy')
    await expect(
      committedOpen.drawer.getByText(/No unapplied changes|Không có thay đổi chưa áp dụng/i)
    ).toBeVisible()
    await expect(committedOpen.drawer.getByLabel(/Apply filter changes/i)).toBeDisabled()

    await committedOpen.drawer.getByLabel(/Difficulty|Độ khó/i).selectOption('hard')
    await expect(
      committedOpen.drawer.getByText(/Unapplied changes|Thay đổi chưa áp dụng/i)
    ).toBeVisible()
    await expect(page).toHaveURL(committedUrl)

    await page.goBack()
    await expect(filterDrawer(page)).not.toBeVisible()
    await expect(page).toHaveURL(committedUrl)
    await expect(page.getByRole('button', { name: /More filters|Thêm bộ lọc/i })).toBeFocused()

    await page.screenshot({
      path: 'test-results/e2e-visual/filter-search-taxonomy/rp-fst-05/chromium/mobile/01-user-mobile-dirty-draft-back.png',
      fullPage: true,
    })

    const cancelOpen = await openFilterDrawer(page)
    await expect(cancelOpen.drawer.getByLabel(/Difficulty|Độ khó/i)).toHaveValue('easy')
    await cancelOpen.drawer.getByLabel(/Difficulty|Độ khó/i).selectOption('medium')
    await expect(
      cancelOpen.drawer.getByText(/Unapplied changes|Thay đổi chưa áp dụng/i)
    ).toBeVisible()
    await cancelOpen.drawer.getByLabel(/Cancel filter changes/i).click()

    await expect(filterDrawer(page)).not.toBeVisible()
    await expect(page).toHaveURL(committedUrl)
    await expect(page.getByRole('button', { name: /More filters|Thêm bộ lọc/i })).toBeFocused()

    const rehydrated = await openFilterDrawer(page)
    await expect(rehydrated.drawer.getByLabel(/Difficulty|Độ khó/i)).toHaveValue('easy')
    await expect(
      rehydrated.drawer.getByText(/No unapplied changes|Không có thay đổi chưa áp dụng/i)
    ).toBeVisible()
    await expect(rehydrated.drawer.getByLabel(/Apply filter changes/i)).toBeDisabled()
  })
})
