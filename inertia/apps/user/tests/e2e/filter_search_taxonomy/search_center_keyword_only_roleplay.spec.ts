import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

interface SeededSearchContext {
  ownerEmail: string
  taskTitle: string
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
  const payload = JSON.parse(body) as { data?: Partial<SeededSearchContext> }
  const data = payload.data
  if (!data?.ownerEmail || !data.taskTitle) {
    throw new Error('Search role-play seed returned incomplete identifiers')
  }

  return { ownerEmail: data.ownerEmail, taskTitle: data.taskTitle, timestamp }
}

test.describe('Filter/Search/Taxonomy — Search Center keyword-only journey', () => {
  test('submits q-only through the real Search Center and renders the seeded result', async ({
    page,
  }) => {
    const serverErrors: string[] = []
    page.on('response', (response) => {
      if (response.status() >= 500) {
        serverErrors.push(`${response.status()} ${response.url()}`)
      }
    })

    const seeded = await seedSearchContext(page)
    await login(page, seeded.ownerEmail)

    await page.goto('/search')
    await expect(
      page.getByRole('heading', { name: /Search Center|Trung tâm tìm kiếm/i })
    ).toBeVisible()

    const searchInput = page.getByPlaceholder(
      /Search tasks, projects, comments, talent, skills, organizations|Tìm task, project, comment, talent, skill, organization/i
    )
    await expect(searchInput).toBeVisible()
    await searchInput.fill(seeded.taskTitle)
    await searchInput.press('Enter')

    await expect(page).toHaveURL(/\/search\?q=/)
    const submittedUrl = new URL(page.url())
    expect(submittedUrl.searchParams.get('q')).toBe(seeded.taskTitle)
    expect(submittedUrl.searchParams.has('type')).toBe(false)
    expect(submittedUrl.searchParams.has('field')).toBe(false)
    await expect(page.getByRole('link').filter({ hasText: seeded.taskTitle }).first()).toBeVisible()
    await expect(page.locator('[data-search-result-mode="discovery"]').first()).toBeVisible()

    const domainFilters = page.getByLabel(/Search result filters|Bộ lọc kết quả tìm kiếm/i)
    await expect(domainFilters.getByRole('button', { name: /All|Tất cả/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    const taskFilter = domainFilters.getByRole('button', { name: /Tasks|Công việc/i })
    await expect(taskFilter).toHaveAttribute('aria-pressed', 'false')
    await taskFilter.click()
    await expect(page).toHaveURL(/\/search\?q=.*type=task/)
    await expect(
      page.getByLabel(/Search result filters|Bộ lọc kết quả tìm kiếm/i).getByRole('button', {
        name: /Tasks|Công việc/i,
      })
    ).toHaveAttribute('aria-pressed', 'true')

    await expect(page.locator('body')).not.toContainText(/\b5(?:00|01|02|03|04|05)\b/)
    expect(serverErrors, `Unexpected server errors: ${serverErrors.join(', ')}`).toEqual([])

    await page.screenshot({
      path: 'test-results/e2e-visual/filter-search-taxonomy/rp-fst-02/chromium/desktop/search-center-keyword-only.png',
      fullPage: true,
    })
  })
})
