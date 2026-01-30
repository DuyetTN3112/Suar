import { expect, test } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

interface SeedResponse {
  data: {
    organizationId: string
    projectId: string
    managerEmail: string
    workerEmail: string
  }
}

test.describe('Project workspace access', () => {
  test('regular project members stay in personal space while project managers can enter', async ({
    page,
  }) => {
    const seed = await page.request.post(`${BASE}/api/testing/seed-task-review-board-flow`, {
      data: {
        timestamp: Date.now(),
        nonce: 'project-workspace-access',
      },
    })
    expect(seed.status()).toBe(201)
    const { organizationId, projectId, managerEmail, workerEmail } = (
      (await seed.json()) as SeedResponse
    ).data

    await login(page, workerEmail, { organizationId })
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: /Project workspace|Không gian dự án/i })).toHaveCount(
      0
    )

    const deniedSwitch = await page.request.post(`${BASE}/switch-project`, {
      data: {
        projectId,
        currentPath: '/dashboard',
      },
    })
    expect(deniedSwitch.status()).toBe(403)

    const deniedBoard = await page.request.get(`${BASE}/projects/${projectId}/tasks`, {
      headers: {
        Accept: 'text/html',
      },
    })
    expect(deniedBoard.status()).toBe(403)

    await login(page, managerEmail, { organizationId })
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(
      page.getByRole('button', { name: /Project workspace|Không gian dự án/i })
    ).toBeVisible()

    const allowedBoard = await page.request.get(`${BASE}/projects/${projectId}/tasks`, {
      headers: {
        Accept: 'text/html',
      },
    })
    expect(allowedBoard.ok()).toBe(true)
  })
})
