import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, test } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const SCREENSHOT_DIR = resolve('tmp/tva-e2e/task-review-observation')
mkdirSync(SCREENSHOT_DIR, { recursive: true })
const SCREENSHOT = resolve(SCREENSHOT_DIR, '04-reviewer-claim-verification.png')

interface SeedResponse {
  data: {
    organizationId: string
    projectId: string
    managerEmail: string
    taskId: string
    workflowId: string
    assignmentSnapshotId: string
    completionReportId: string
    claimId: string
    evidenceId: string
  }
}

test('reviewer verifies a native Completion Report claim with linked evidence', async ({ page }) => {
  const seed = await page.request.post(`${BASE}/api/testing/seed-task-review-observation-flow`, {
    data: { timestamp: Date.now(), nonce: 'native-claim-observation' },
  })
  expect(seed.status(), await seed.text()).toBe(201)
  const seeded = (await seed.json()) as SeedResponse

  await login(page, seeded.data.managerEmail, { organizationId: seeded.data.organizationId })
  await page.goto(
    `/projects/${seeded.data.projectId}/reviews/tasks?task_id=${seeded.data.taskId}`
  )

  const authoring = page.getByTestId('review-observation-authoring')
  await expect(authoring).toBeVisible()
  await expect(authoring).toContainText(seeded.data.assignmentSnapshotId)
  await expect(authoring).toContainText('Completion report')

  await page.getByLabel('Claim').selectOption(seeded.data.claimId)
  await expect(authoring).toContainText('Claim-linked evidence available: 1/1')
  await page.getByLabel('Rationale').fill(
    'The submitted report and available integration evidence support the claimed implementation scope.'
  )

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/reviews/${seeded.data.workflowId}/observations`) &&
      response.request().method() === 'POST'
  )
  await page.getByRole('button', { name: 'Submit observation' }).click()
  const response = await responsePromise
  expect(response.status()).toBeLessThan(400)
  await expect(page).toHaveURL(
    new RegExp(`/projects/${seeded.data.projectId}/reviews/tasks\\?task_id=${seeded.data.taskId}$`)
  )
  await page.goto(
    `/projects/${seeded.data.projectId}/reviews/tasks?task_id=${seeded.data.taskId}`
  )
  const inertiaResponse = await page.request.get(
    `${BASE}/projects/${seeded.data.projectId}/reviews/tasks?task_id=${seeded.data.taskId}`,
    {
      headers: {
        Accept: 'text/html, application/xhtml+xml',
        'X-Inertia': 'true',
        'X-Requested-With': 'XMLHttpRequest',
      },
    }
  )
  const reviewPagePayload = (await inertiaResponse.json()) as {
    props?: {
      selectedTaskId?: string | null
      detail?: {
        workflow?: { id?: string }
        reviewAuthoringContext?: { observations?: unknown[] }
      }
    }
  }
  expect(inertiaResponse.status()).toBe(409)
  expect(reviewPagePayload.props?.selectedTaskId).toBe(seeded.data.taskId)
  expect(reviewPagePayload.props?.detail?.workflow?.id).toBe(seeded.data.workflowId)
  await expect(page.getByTestId('review-observation-history')).toContainText('confirm')
  await expect(page.getByTestId('review-observation-history')).toContainText(
    'The submitted report and available integration evidence support the claimed implementation scope.'
  )
  await page.screenshot({ path: SCREENSHOT, fullPage: true })
})

test('reviewer narrows a native claim and preserves the governed rationale', async ({ page }) => {
  const seed = await page.request.post(`${BASE}/api/testing/seed-task-review-observation-flow`, {
    data: { timestamp: Date.now(), nonce: 'native-narrow-observation' },
  })
  expect(seed.status(), await seed.text()).toBe(201)
  const seeded = (await seed.json()) as SeedResponse

  await login(page, seeded.data.managerEmail, { organizationId: seeded.data.organizationId })
  await page.goto(`/projects/${seeded.data.projectId}/reviews/tasks?task_id=${seeded.data.taskId}`)
  const authoring = page.getByTestId('review-observation-authoring')
  await expect(authoring).toBeVisible()
  await page.getByLabel('Claim').selectOption(seeded.data.claimId)
  await page.getByLabel('Disposition').selectOption('narrow')
  const rationale = 'The evidence supports the implementation contribution, but not the broader ownership wording.'
  await page.getByLabel('Rationale').fill(rationale)

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/reviews/${seeded.data.workflowId}/observations`) &&
      response.request().method() === 'POST'
  )
  await page.getByRole('button', { name: 'Submit observation' }).click()
  const response = await responsePromise
  expect(response.status()).toBeLessThan(400)
  await page.goto(`/projects/${seeded.data.projectId}/reviews/tasks?task_id=${seeded.data.taskId}`)
  await expect(page.getByTestId('review-observation-history')).toContainText('narrow')
  await expect(page.getByTestId('review-observation-history')).toContainText(rationale)
})

test('reviewer rejects a native claim and preserves the governed rejection rationale', async ({ page }) => {
  const seed = await page.request.post(`${BASE}/api/testing/seed-task-review-observation-flow`, {
    data: { timestamp: Date.now(), nonce: 'native-reject-observation' },
  })
  expect(seed.status(), await seed.text()).toBe(201)
  const seeded = (await seed.json()) as SeedResponse

  await login(page, seeded.data.managerEmail, { organizationId: seeded.data.organizationId })
  await page.goto(`/projects/${seeded.data.projectId}/reviews/tasks?task_id=${seeded.data.taskId}`)
  await expect(page.getByTestId('review-observation-authoring')).toBeVisible()
  await page.getByLabel('Claim').selectOption(seeded.data.claimId)
  await page.getByLabel('Disposition').selectOption('reject')
  const rationale = 'The available evidence does not support the submitted claim at the requested scope.'
  await page.getByLabel('Rationale').fill(rationale)

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/reviews/${seeded.data.workflowId}/observations`) &&
      response.request().method() === 'POST'
  )
  await page.getByRole('button', { name: 'Submit observation' }).click()
  const response = await responsePromise
  expect(response.status()).toBeLessThan(400)
  await page.goto(`/projects/${seeded.data.projectId}/reviews/tasks?task_id=${seeded.data.taskId}`)
  const history = page.getByTestId('review-observation-history')
  await expect(history).toContainText('reject')
  await expect(history).toContainText(rationale)
})
