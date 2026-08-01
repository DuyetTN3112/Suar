import { test, expect, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

interface SeedResponse {
  data: {
    organizationId: string
    projectId: string
    sprintId: string
    disputeId: string
    ownerEmail: string
    workerEmail: string
    adminEmail: string
  }
}

async function seedSprintGovernance(page: Page): Promise<SeedResponse['data']> {
  const response = await page.request.post(
    `${BASE_URL}/api/testing/seed-sprint-review-governance-flow`,
    {
      data: {
        timestamp: Date.now(),
        nonce: Math.random().toString(36).slice(2, 8),
        taskInSprint: true,
      },
    }
  )
  expect(response.ok()).toBeTruthy()
  const body = (await response.json()) as SeedResponse
  return body.data
}

test.describe('Sprint review governance role experience', () => {
  test('manager opens review, worker submits package, admin sees dispute readiness gate', async ({
    page,
  }) => {
    const browserErrors: string[] = []
    page.on('pageerror', (error) => browserErrors.push(error.message))

    const seed = await seedSprintGovernance(page)

    await login(page, seed.ownerEmail, { organizationId: seed.organizationId })
    await page.goto(`${BASE_URL}/projects/${seed.projectId}?focus=sprints`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('region', { name: 'Sprint của project' })).toBeVisible()
    const sprintPanel = page
      .locator('section, div')
      .filter({
        has: page.getByRole('heading', { name: 'Sprint của project' }),
      })
      .first()
    await expect(sprintPanel.getByText('Đang chạy', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Kết thúc sprint' }).click()
    await expect(page.getByText('Review đang mở cho người tham gia')).toBeVisible()

    await login(page, seed.workerEmail, { organizationId: seed.organizationId })
    await page.goto(`${BASE_URL}/projects/${seed.projectId}/reviews/assigners`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Sprint reviews cần gửi')).toBeVisible()
    await expect(page.getByText('1 chờ gửi', { exact: true }).first()).toBeVisible()
    await expect(page.getByText(/Seed Sprint Review/)).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Review người giao việc', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Review môi trường', exact: true })
    ).toBeVisible()

    const commentBoxes = page.getByPlaceholder(/Điểm mạnh|Quy trình/)
    await expect(commentBoxes).toHaveCount(3)
    await commentBoxes.nth(0).fill('Manager clarified priorities and scope.')
    await commentBoxes.nth(1).fill('Project rituals were clear.')
    await commentBoxes.nth(2).fill('Organization support was responsive.')
    await page.getByRole('button', { name: 'Gửi sprint review' }).click()
    await expect(page.getByText('Đã gửi sprint review', { exact: true })).toBeVisible()
    await expect(page.getByText('0 chờ gửi', { exact: true }).first()).toBeVisible()

    await login(page, seed.ownerEmail, { organizationId: seed.organizationId })
    await page.goto(`${BASE_URL}/projects/${seed.projectId}?focus=sprints`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Review đang mở cho người tham gia')).toBeVisible()
    await expect(page.getByText(/Còn \d+ review sau sprint chưa done/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Đóng kỳ review' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Kết thúc sprint' })).toBeDisabled()

    await login(page, seed.adminEmail, {
      organizationId: seed.organizationId,
      systemRole: 'superadmin',
    })
    await page.goto(`${BASE_URL}/admin/disputes/${seed.disputeId}`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('tab', { name: 'Xử lý' }).click()
    await expect(page.getByText('Dossier chưa đủ dữ liệu bắt buộc')).toBeVisible()
    await expect(
      page.getByText('counterparty_dispute_message', { exact: true }).first()
    ).toBeVisible()

    const resolveButton = page.getByRole('button', { name: 'Ban hành quyết định' })
    await expect(resolveButton).toBeDisabled()
    await page.getByLabel('Override').check()
    await expect(resolveButton).toBeDisabled()
    await page.getByLabel(/Lý do override/).fill('Counterparty unavailable during admin audit.')
    await expect(resolveButton).toBeDisabled()
    await page.getByLabel(/Giải trình quyết định/).fill('Admin reviewed available sprint evidence.')
    await expect(resolveButton).toBeEnabled()

    expect(browserErrors).toEqual([])
  })
})
