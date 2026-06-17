import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { test, expect, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const SCREENSHOT_DIR = resolve('test-results/e2e-visual/sprint-management')

interface SeedResponse {
  data: {
    organizationId: string
    projectId: string
    sprintId: string
    taskId: string
    foreignSprintId?: string
    ownerEmail: string
    workerEmail: string
  }
}

async function seedSprintBoard(
  page: Page,
  options: { withForeignSprint?: boolean } = {}
): Promise<SeedResponse['data']> {
  const response = await page.request.post(
    `${BASE_URL}/api/testing/seed-sprint-review-governance-flow`,
    {
      data: {
        timestamp: Date.now(),
        nonce: Math.random().toString(36).slice(2, 8),
        withForeignSprint: options.withForeignSprint ?? false,
      },
    }
  )
  expect(response.ok()).toBe(true)
  const body = (await response.json()) as SeedResponse
  return body.data
}

async function csrfToken(page: Page): Promise<string> {
  await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
  return (await page.locator('meta[name="csrf-token"]').getAttribute('content')) ?? ''
}

async function screenshot(page: Page, name: string) {
  const path = resolve(SCREENSHOT_DIR, `${name}.png`)
  mkdirSync(dirname(path), { recursive: true })
  await page.getByRole('heading', { name: /^Backlog$/ }).scrollIntoViewIfNeeded()
  await page.screenshot({ path, fullPage: false })
}

test.describe('Sprint board role experience', () => {
  test('manager can move backlog task while member cannot manage sprint from task board', async ({
    page,
  }) => {
    const browserErrors: string[] = []
    page.on('pageerror', (error) => browserErrors.push(error.message))

    const seed = await seedSprintBoard(page)

    await login(page, seed.ownerEmail, { organizationId: seed.organizationId })
    await page.goto(`${BASE_URL}/org/projects/${seed.projectId}?focus=sprints`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('region', { name: 'Sprint của project' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Backlog$/ })).toBeVisible()
    await expect(page.getByText(/Seed Sprint Task/).first()).toBeVisible()
    await page.getByRole('button', { name: 'Đưa vào sprint' }).click()
    await expect(page.getByRole('button', { name: 'Về backlog' })).toBeVisible()
    await screenshot(page, '01-manager-sprint-management-board')

    await login(page, seed.workerEmail, { organizationId: seed.organizationId })
    await page.goto(`${BASE_URL}/org/tasks/board?project_id=${seed.projectId}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Quản lý nhiệm vụ' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Đưa vào sprint' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Về backlog' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Kết thúc sprint' })).toHaveCount(0)

    expect(browserErrors).toEqual([])
  })

  test('manager cannot move task into a sprint from another project', async ({ page }) => {
    const browserErrors: string[] = []
    page.on('pageerror', (error) => browserErrors.push(error.message))

    const seed = await seedSprintBoard(page, { withForeignSprint: true })
    expect(typeof seed.foreignSprintId).toBe('string')

    await login(page, seed.ownerEmail, { organizationId: seed.organizationId })
    await page.goto(`${BASE_URL}/org/projects/${seed.projectId}?focus=sprints`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /^Backlog$/ })).toBeVisible()
    await expect(page.getByText(/Seed Sprint Task/).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Đưa vào sprint' })).toBeVisible()

    const response = await page.request.patch(
      `${BASE_URL}/api/v1/projects/${seed.projectId}/tasks/${seed.taskId}/sprint`,
      {
        data: { projectSprintId: seed.foreignSprintId },
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN': await csrfToken(page),
        },
      }
    )
    expect(response.status()).toBe(400)

    await page.goto(`${BASE_URL}/org/projects/${seed.projectId}?focus=sprints`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/Seed Sprint Task/).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Đưa vào sprint' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Về backlog' })).toHaveCount(0)
    expect(browserErrors).toEqual([])
  })
})
