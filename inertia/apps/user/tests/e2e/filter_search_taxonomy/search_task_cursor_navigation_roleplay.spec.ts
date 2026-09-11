import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

interface SeededSearchContext {
  ownerEmail: string
  taskTitle: string
  timestamp: number
}

async function seedSearchContext(page: Page, searchMarker: string): Promise<SeededSearchContext> {
  const timestamp = Date.now() + Math.floor(Math.random() * 1_000)
  const response = await page.request.post('/api/testing/seed-marketplace-application-flow', {
    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    data: {
      timestamp,
      nonce: Math.random().toString(36).slice(2, 10),
      withApplication: false,
      searchMarker,
      searchTaskCount: 25,
    },
  })
  const body = (await response.json()) as {
    data?: Partial<SeededSearchContext> & { applicantEmail?: string }
  }

  expect(response.ok(), JSON.stringify(body)).toBe(true)
  if (!body.data?.ownerEmail || !body.data.applicantEmail || !body.data.taskTitle) {
    throw new Error('TC-FST-024 cursor fixture returned incomplete identifiers')
  }

  return {
    ownerEmail: body.data.ownerEmail,
    taskTitle: body.data.taskTitle,
    timestamp,
  }
}

async function cleanupSearchContexts(page: Page, seeded: readonly SeededSearchContext[]) {
  const tokens = [...new Set(seeded.map(({ timestamp }) => timestamp))]
  if (tokens.length === 0) return

  const response = await page.request.post('/api/testing/seed-cleanup', {
    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    data: { tokens },
  })
  const body = await response.text()
  expect(response.ok(), body).toBe(true)
}

test.describe('Filter/Search/Taxonomy — TC-FST-024 task cursor navigation', () => {
  test('clicks Next page through Search Center and preserves a shareable task cursor', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const searchMarker = `tcFst024Next${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
    const seeded: SeededSearchContext[] = []

    try {
      seeded.push(await seedSearchContext(page, searchMarker))
      const firstSeed = seeded[0]
      if (!firstSeed) throw new Error('TC-FST-024 cursor fixture did not produce a seed')

      await login(page, firstSeed.ownerEmail)
      await page.goto(`/search?q=${encodeURIComponent(searchMarker)}&type=task`)
      await expect(
        page.getByRole('heading', { name: /Search Center|Trung tâm tìm kiếm/i })
      ).toBeVisible()
      const resultLinks = page.locator('[data-search-result-mode="discovery"]')
      await expect(resultLinks).toHaveCount(24)
      const firstPageHrefs = new Set(
        await resultLinks.evaluateAll((links) =>
          links
            .map((link) => link.getAttribute('href'))
            .filter((href): href is string => href !== null)
        )
      )
      const nextPage = page.getByRole('button', { name: /Next page|Trang kế tiếp/i })
      await expect(nextPage).toBeVisible()

      await nextPage.click()
      await page.waitForURL(
        (url) => url.searchParams.has('cursor') && url.searchParams.get('type') === 'task'
      )
      await expect(resultLinks).toHaveCount(1)
      const secondPageHref = await resultLinks.first().getAttribute('href')
      expect(secondPageHref).toBeTruthy()
      expect(firstPageHrefs.has(secondPageHref ?? '')).toBe(false)
      await expect(page.getByRole('button', { name: /Next page|Trang kế tiếp/i })).not.toBeVisible()

      await page.screenshot({
        path: 'test-results/e2e-visual/filter-search-taxonomy/tc-fst-024/chromium/desktop/search-task-cursor-next.png',
        fullPage: true,
      })
    } finally {
      await cleanupSearchContexts(page, seeded)
    }
  })
})
