import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const SCREENSHOT_DIR = resolve('test-results/e2e-visual/project-backlog-sprint-planning')

type PlanningSeed = {
  organizationId: string
  projectId: string
  currentSprintId: string
  nextSprintId: string
  taskIds: string[]
  ownerEmail: string
  workerEmail: string
}

async function seed(page: Page, mode: 'planning' | 'active' = 'planning'): Promise<PlanningSeed> {
  const response = await page.request.post(`${BASE_URL}/api/testing/seed-project-sprint-planning-flow`, {
    data: { timestamp: Date.now(), nonce: Math.random().toString(36).slice(2, 8), mode },
  })
  if (!response.ok()) {
    throw new Error(`planning seed failed: ${response.status()} ${await response.text()}`)
  }
  const body = (await response.json()) as { data: PlanningSeed }
  return body.data
}

async function capture(page: Page, name: string) {
  const path = resolve(SCREENSHOT_DIR, `${name}.png`)
  mkdirSync(dirname(path), { recursive: true })
  await page.screenshot({ path, fullPage: false })
}

async function openPlanning(page: Page, seedData: PlanningSeed, email: string, shell: 'org' | 'user' = 'org') {
  await login(page, email, { organizationId: seedData.organizationId })
  await page.goto(`${BASE_URL}/${shell === 'org' ? 'org/' : ''}projects/${seedData.projectId}?focus=sprints`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(/Sprint Management|Sprint Backlog|Product Backlog|Danh sách chờ/).first()).toBeVisible()
}

test.describe('Project Product Backlog and Sprint planning', () => {
  test('manager sees ordered backlog, starts a draft Sprint, and moves work', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const seedData = await seed(page)
    await openPlanning(page, seedData, seedData.ownerEmail)

    await expect(page.getByText(/Planning Sprint 1/)).toBeVisible()
    await expect(page.getByText(/Planning Sprint 2/)).toBeVisible()
    await expect(page.getByRole('button', { name: /Start sprint|Bắt đầu sprint/ })).toHaveCount(2)
    await page.getByRole('button', { name: /Start sprint|Bắt đầu sprint/ }).first().click()
    await expect(page.getByText(/Active|Đang hoạt động/).first()).toBeVisible()
    await page.getByRole('button', { name: /View board|Xem board/ }).first().click()
    await expect(page.getByText(/Planning Task 1/)).toBeVisible()
    await page.getByRole('button', { name: /Move to sprint|Đưa vào sprint/ }).first().click()
    await expect(page.getByRole('button', { name: /Move to backlog|Về backlog/ }).first()).toBeVisible()
    await capture(page, '01-manager-plans-and-starts')
    expect(errors).toEqual([])
  })

  test('manager sees active scope changes and explicit end-delivery buckets', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const seedData = await seed(page, 'active')
    await openPlanning(page, seedData, seedData.ownerEmail)

    await page.getByRole('button', { name: /Move to sprint|Đưa vào sprint/ }).first().click()
    await expect(page.getByRole('button', { name: /Move to sprint|Đưa vào sprint/ })).toHaveCount(0)
    await page.getByRole('button', { name: /End sprint|Kết thúc sprint/ }).click()
    await expect(page.getByRole('dialog', { name: /End Sprint delivery|Kết thúc delivery/ })).toBeVisible()
    await expect(page.getByText(/Kept in historical Sprint|Giữ trong Sprint lịch sử/).first()).toBeVisible()
    const destinations = page.getByRole('combobox')
    for (let index = 0; index < await destinations.count(); index += 1) {
      await destinations.nth(index).selectOption(index === 0 ? 'backlog' : seedData.nextSprintId)
    }
    await page.getByRole('button', { name: /End delivery|Kết thúc delivery/ }).click()
    await expect(page.getByText(/In review|Đang review/).first()).toBeVisible()
    await capture(page, '02-active-scope-and-end-delivery')
    expect(errors).toEqual([])
  })

  test('members retain reads but cannot mutate planning', async ({ page }) => {
    const seedData = await seed(page)
    await login(page, seedData.workerEmail, { organizationId: seedData.organizationId })
    const boardResponse = await page.request.get(`${BASE_URL}/api/v1/projects/${seedData.projectId}/sprint-board`)
    expect(boardResponse.ok()).toBe(true)
    await page.goto(`${BASE_URL}/org/projects/${seedData.projectId}?focus=sprints`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /Start sprint|Bắt đầu sprint/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Move to sprint|Đưa vào sprint/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /End sprint|Kết thúc sprint/ })).toHaveCount(0)
  })
})
