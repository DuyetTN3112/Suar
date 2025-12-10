import { expect, test } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

const surfaces = [
  {
    name: 'marketplace-tasks',
    path: '/marketplace/tasks',
    heading: 'Thị trường task',
    expectsPaginationText: /\/ \d+/,
  },
  {
    name: 'my-applications',
    path: '/my-applications',
    heading: 'Đề xuất tham gia của tôi',
  },
  {
    name: 'org-talents',
    path: '/org/talents',
    heading: 'Danh bạ Talent Tổ chức',
    expectsPaginationText: /\/ \d+/,
  },
  {
    name: 'org-bookmarks',
    path: '/org/bookmarks',
    heading: 'Talent đã lưu',
    expectsPaginationText: /\/ \d+/,
  },
  {
    name: 'org-tasks-list',
    path: '/org/tasks/list',
    region: 'Danh sách task tổ chức',
    expectsPaginationText: /Page \d+ of \d+|\d+-\d+ \/ \d+/,
  },
] as const

test.describe('Pagination Surface Screenshot Audit', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  for (const surface of surfaces) {
    test(`${surface.name} renders pagination surface without broken state`, async ({ page }) => {
      await page.goto(surface.path)

      const body = page.locator('body')
      await expect(body).not.toContainText(/500|internal server error|undefined|null/i)

      if ('region' in surface) {
        await expect(page.getByRole('region', { name: surface.region })).toBeVisible()
      } else {
        await expect(
          page.getByRole('heading', { level: 1, name: surface.heading, exact: true })
        ).toBeVisible()
      }

      if ('expectsPaginationText' in surface) {
        await expect(body).toContainText(surface.expectsPaginationText)
      }

      await page.screenshot({
        path: `test-results/pagination-surface-${surface.name}.png`,
        fullPage: true,
      })
    })
  }
})
