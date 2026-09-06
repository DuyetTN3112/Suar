import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

interface SeededSearchContext {
  ownerEmail: string
  taskId: string
  taskTitle: string
  timestamp: number
}

async function seedSearchContext(
  page: Page,
  searchMarker: string,
  timestamp: number
): Promise<SeededSearchContext> {
  const response = await page.request.post('/api/testing/seed-marketplace-application-flow', {
    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    data: {
      timestamp,
      nonce: Math.random().toString(36).slice(2, 10),
      withApplication: false,
      searchMarker,
    },
  })
  const body = (await response.json()) as { data?: Partial<SeededSearchContext> }

  expect(response.ok(), JSON.stringify(body)).toBe(true)
  if (!body.data?.ownerEmail || !body.data.taskId || !body.data.taskTitle) {
    throw new Error('TC-FST-002 seed returned incomplete identifiers')
  }

  return {
    ownerEmail: body.data.ownerEmail,
    taskId: body.data.taskId,
    taskTitle: body.data.taskTitle,
    timestamp,
  }
}

async function cleanupSearchContext(page: Page, timestamp: number): Promise<void> {
  const response = await page.request.post('/api/testing/seed-cleanup', {
    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    data: { tokens: [String(timestamp)] },
  })
  const body = await response.text()
  expect(response.ok(), body).toBe(true)
}

test.describe('Filter/Search/Taxonomy — TC-FST-002 q-only Search journey', () => {
  test('retrieves a seeded task through the canonical q-only Search Center route', async ({
    page,
  }) => {
    const searchMarker = `tcFst002${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
    const seedTimestamp = Date.now()
    const browserErrors: string[] = []
    const failedRequests: string[] = []
    const serverErrors: string[] = []

    page.on('pageerror', (error) => browserErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text())
    })
    page.on('requestfailed', (request) => {
      const failure = request.failure()?.errorText ?? 'unknown'
      const requestUrl = new URL(request.url())
      const isExpectedTelemetryAbort =
        request.url().endsWith('/api/telemetry/ui-events') && failure === 'net::ERR_ABORTED'
      const isExpectedNavigationAbort =
        failure === 'net::ERR_ABORTED' &&
        request.method() === 'GET' &&
        (requestUrl.pathname === '/search' ||
          (requestUrl.pathname === '/api/v1/filter-saved-views' &&
            requestUrl.searchParams.get('context') === 'search.blended.global'))
      if (!isExpectedTelemetryAbort && !isExpectedNavigationAbort) {
        failedRequests.push(`${request.method()} ${request.url()} — ${failure}`)
      }
    })
    page.on('response', (response) => {
      if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`)
    })

    let seeded: SeededSearchContext | null = null
    try {
      seeded = await seedSearchContext(page, searchMarker, seedTimestamp)
      await login(page, seeded.ownerEmail)
      await page.goto('/search')
      await expect(
        page.getByRole('heading', { name: /Search Center|Trung tâm tìm kiếm/i })
      ).toBeVisible()

      const searchInput = page.getByPlaceholder(
        /Search tasks, projects, comments, talent, skills, organizations|Tìm task, project, comment, talent, skill, organization/i
      )
      await expect(searchInput).toBeVisible()
      await searchInput.fill(searchMarker)
      await searchInput.press('Enter')

      await expect(page).toHaveURL(/\/search\?q=/)
      const submittedUrl = new URL(page.url())
      expect(submittedUrl.searchParams.get('q')).toBe(searchMarker)
      expect(submittedUrl.searchParams.has('type')).toBe(false)
      expect(submittedUrl.searchParams.has('field')).toBe(false)
      expect(submittedUrl.searchParams.has('cursor')).toBe(false)

      await expect(page.locator('[data-search-result-mode="discovery"]').first()).toBeVisible()
      await expect(
        page.getByRole('link').filter({ hasText: seeded.taskTitle }).first()
      ).toBeVisible()
      await expect(
        page.getByRole('status', { name: /Discovery result authority|Quyền kết quả Discovery/i })
      ).toContainText(/authoritative|toàn quyền|được xác thực/i)

      const filters = page.getByLabel(/Search result filters|Bộ lọc kết quả tìm kiếm/i)
      await expect(filters.getByRole('button', { name: /All|Tất cả/i })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
      expect(await page.locator('[data-search-result-mode="legacy"]').count()).toBe(0)
      expect(browserErrors, `Unexpected browser errors: ${browserErrors.join(' | ')}`).toEqual([])
      expect(failedRequests, `Unexpected failed requests: ${failedRequests.join(' | ')}`).toEqual(
        []
      )
      expect(serverErrors, `Unexpected server errors: ${serverErrors.join(' | ')}`).toEqual([])

      await page.screenshot({
        path: 'test-results/e2e-visual/filter-search-taxonomy/tc-fst-002/chromium/desktop/search-q-only.png',
        fullPage: true,
      })
    } finally {
      await cleanupSearchContext(page, seeded?.timestamp ?? seedTimestamp)
    }
  })
})
