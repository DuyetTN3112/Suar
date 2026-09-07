import { expect, test } from '@playwright/test'

import { ensurePersonaSession } from '../../shared/e2e/fixtures/auth_personas.js'

const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

interface NativeCompletionSeedResponse {
  data: {
    organizationId: string
    projectId: string
    workerEmail: string
    taskId: string
    taskTitle: string
  }
}

test('assignee completes the seeded task without starting a Completion Report', async ({
  page,
}) => {
  const seed = await page.request.post(`${BASE}/api/testing/seed-task-native-completion-flow`, {
    data: { timestamp: Date.now(), nonce: 'native-completion-without-submission' },
  })
  expect(seed.status(), await seed.text()).toBe(201)
  const seeded = (await seed.json()) as NativeCompletionSeedResponse
  const completionReportRequests: string[] = []

  page.on('request', (request) => {
    if (
      request.url().includes('/completion-report') ||
      request.url().includes(`/api/v1/tasks/${seeded.data.taskId}/submission`)
    ) {
      completionReportRequests.push(`${request.method()} ${request.url()}`)
    }
  })

  await ensurePersonaSession(page, seeded.data.workerEmail, seeded.data.organizationId)
  await page.goto(`${BASE}/projects/${seeded.data.projectId}/tasks`)
  await page.waitForLoadState('domcontentloaded')
  await page.getByTitle(seeded.data.taskTitle).click()
  await expect(page.locator('[data-testid="task-drawer-work-surfaces"]')).toBeVisible()

  await expect(page.getByRole('heading', { name: /Submission|Nộp bài/i })).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: /Completion Report|Báo cáo hoàn thành/i })
  ).toHaveCount(0)
  await expect(page.getByLabel(/Work performed|Công việc đã thực hiện/i)).toHaveCount(0)

  const statusResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/v1/tasks/${seeded.data.taskId}/sort-order`) &&
      response.request().method() === 'PATCH'
  )
  await page.getByRole('button', { name: /^DONE$/i }).click()
  const response = await statusResponse
  expect(response.status(), await response.text()).toBeLessThan(400)

  const detailResponse = await page.request.get(`${BASE}/api/v1/tasks/${seeded.data.taskId}`)
  expect(detailResponse.ok(), await detailResponse.text()).toBe(true)
  const detailPayload = (await detailResponse.json()) as { data?: { status?: string } }
  expect(detailPayload.data?.status).toBe('done')
  expect(completionReportRequests).toEqual([])
})
