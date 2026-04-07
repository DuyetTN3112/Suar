import { expect, test } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const E2E_ORG_OWNER = 'tranngocduyet31@gmail.com'

const RETIRED_ORG_PROJECT_SURFACES = [
  '/org/tasks/board',
  '/org/tasks/list',
  '/org/tasks/workflow',
  '/org/reviews/task-board',
  '/org/reviews/sprint-reverse-board',
  '/org/reverse-reviews',
  '/org/disputes',
] as const

test.describe('Organization Management navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_ORG_OWNER)
  })

  test('contains governance and portfolio links without Project board copies', async ({ page }) => {
    await page.goto('/org')
    await page.waitForLoadState('networkidle')

    const hrefs = await page
      .locator('aside nav a[href]')
      .evaluateAll((links) =>
        links.map((link) => link.getAttribute('href')).filter((href): href is string => !!href)
      )

    expect(hrefs).toContain('/org')
    expect(hrefs).toContain('/org/projects')
    expect(hrefs).toEqual(expect.not.arrayContaining([...RETIRED_ORG_PROJECT_SURFACES]))
    expect(hrefs.some((href) => href.startsWith('/projects/') && href.includes('/reviews/'))).toBe(
      false
    )
  })

  test('does not register retired Organization task, review, history, or dispute pages', async ({
    page,
  }) => {
    for (const path of RETIRED_ORG_PROJECT_SURFACES) {
      const response = await page.request.get(path, { maxRedirects: 0 })
      expect(response.status(), path).toBe(404)
    }
  })
})
