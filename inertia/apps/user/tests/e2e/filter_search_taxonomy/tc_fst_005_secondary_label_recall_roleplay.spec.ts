import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

interface SeededSearchContext {
  ownerEmail: string
  taskId: string
  taskTitle: string
  timestamp: number
  secondaryLabels: {
    skill: string
    tag: string
    classification: string
  }
}

async function seedSearchContext(
  page: Page,
  timestamp: number,
  nonce: string
): Promise<SeededSearchContext> {
  const response = await page.request.post('/api/testing/seed-marketplace-application-flow', {
    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    data: {
      timestamp,
      nonce,
      withApplication: false,
    },
  })
  const body = (await response.json()) as {
    data?: Partial<SeededSearchContext> & {
      ownerEmail?: string
      taskId?: string
      taskTitle?: string
    }
  }

  expect(response.ok(), JSON.stringify(body)).toBe(true)
  if (!body.data?.ownerEmail || !body.data.taskId || !body.data.taskTitle) {
    throw new Error('TC-FST-005 seed returned incomplete identifiers')
  }

  const seedKey = `${timestamp}-${nonce}`
  return {
    ownerEmail: body.data.ownerEmail,
    taskId: body.data.taskId,
    taskTitle: body.data.taskTitle,
    timestamp,
    secondaryLabels: {
      skill: `Marketplace API Design ${seedKey}`,
      tag: 'release-readiness',
      classification: 'compliance',
    },
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

async function searchThroughCenter(
  page: Page,
  query: string,
  taskId: string,
  taskTitle: string
): Promise<void> {
  const searchInput = page.getByPlaceholder(
    /Search tasks, projects, comments, talent, skills, organizations|Tìm task, project, comment, talent, skill, organization/i
  )
  await expect(searchInput).toBeVisible()
  await searchInput.fill(query)
  await expect(searchInput).toHaveValue(query)
  await searchInput.press('Enter')

  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(query)
  const filters = page.getByLabel(/Search result filters|Bộ lọc kết quả tìm kiếm/i)
  await filters.getByRole('button', { name: /Tasks|Tác vụ/i }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('type')).toBe('task')
  const submittedUrl = new URL(page.url())
  expect(submittedUrl.searchParams.get('q')).toBe(query)
  expect(submittedUrl.searchParams.get('type')).toBe('task')
  expect(submittedUrl.searchParams.has('field')).toBe(false)

  const taskResult = page
    .locator('[data-search-result-mode="discovery"]')
    .filter({ hasText: taskTitle })
    .first()
  await expect(taskResult).toBeVisible()
  await expect(taskResult).toHaveAttribute('href', `/tasks/${taskId}`)
}

test.describe('Filter/Search/Taxonomy — TC-FST-005 bounded lexical Search Center journey', () => {
  test('recalls a task through secondary skill, tag, and classification labels', async ({
    page,
  }) => {
    const timestamp = Date.now()
    const nonce = `tcFst005${Math.random().toString(36).slice(2, 10)}`
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
      seeded = await seedSearchContext(page, timestamp, nonce)
      await login(page, seeded.ownerEmail)
      await page.goto('/search')
      await expect(
        page.getByRole('heading', { name: /Search Center|Trung tâm tìm kiếm/i })
      ).toBeVisible()

      const cases = [
        { kind: 'secondary skill', query: seeded.secondaryLabels.skill },
        { kind: 'secondary tag', query: seeded.secondaryLabels.tag },
        { kind: 'secondary classification', query: seeded.secondaryLabels.classification },
      ]

      for (const current of cases) {
        expect(seeded.taskTitle).not.toContain(current.query)
        await searchThroughCenter(page, current.query, seeded.taskId, seeded.taskTitle)
      }

      expect(browserErrors, `Unexpected browser errors: ${browserErrors.join(' | ')}`).toEqual([])
      expect(failedRequests, `Unexpected failed requests: ${failedRequests.join(' | ')}`).toEqual(
        []
      )
      expect(serverErrors, `Unexpected server errors: ${serverErrors.join(' | ')}`).toEqual([])

      await page.screenshot({
        path: 'test-results/e2e-visual/filter-search-taxonomy/tc-fst-005/chromium/desktop/secondary-label-recall.png',
        fullPage: true,
      })
    } finally {
      await cleanupSearchContext(page, seeded?.timestamp ?? timestamp)
    }
  })
})
