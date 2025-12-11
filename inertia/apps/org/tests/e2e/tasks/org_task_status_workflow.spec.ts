import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE_URL = `http://127.0.0.1:${process.env['PORT'] ?? '3333'}`
const SCREENSHOT_DIR = resolve('test-results/e2e-visual/org-task-status-workflow')

interface SeedResponse {
  data: {
    organizationId: string
    projectId: string
    ownerEmail: string
  }
}

async function seedTaskWorkflow(page: Page): Promise<SeedResponse['data']> {
  const response = await page.request.post(`${BASE_URL}/api/testing/seed-task-create-flow`, {
    data: {
      timestamp: Date.now(),
      nonce: Math.random().toString(36).slice(2, 8),
    },
  })
  expect(response.ok()).toBeTruthy()
  const body = (await response.json()) as SeedResponse
  return body.data
}

async function screenshot(page: Page, name: string) {
  const path = resolve(SCREENSHOT_DIR, `${name}.png`)
  mkdirSync(dirname(path), { recursive: true })
  await page.screenshot({ path, fullPage: true })
}

async function createStatus(page: Page, statusName: string): Promise<string> {
  await page.getByRole('button', { name: 'Thêm trạng thái mới' }).click()
  await expect(page.getByRole('heading', { name: 'Them trang thai moi' })).toBeVisible()

  const nameInput = page.locator('#status-name')
  await nameInput.fill(statusName)
  await expect(nameInput).toHaveValue(statusName)
  await expect(page.getByRole('heading', { name: 'Them trang thai moi' })).toBeVisible()
  await screenshot(page, '01-create-status-dialog-keeps-input')

  await page.getByRole('button', { name: 'Chon nhom trang thai', exact: true }).click()
  await page.locator('[data-value="in_progress"]:visible').click()

  const [response] = await Promise.all([
    page.waitForResponse(
      (networkResponse) =>
        networkResponse.url().includes('/api/v1/task-statuses') &&
        networkResponse.request().method() === 'POST' &&
        networkResponse.status() === 201
    ),
    page.locator('button:has-text("Tao trang thai"):visible').click(),
  ])

  await expect(page.getByRole('heading', { name: 'Them trang thai moi' })).toBeHidden()

  const body = (await response.json()) as { data?: { id?: string } }
  const statusId = body.data?.id ?? ''
  expect(statusId).toMatch(/^[0-9a-f-]{36}$/i)
  return statusId
}

async function renameStatus(page: Page, oldName: string, newName: string) {
  const statusColumn = page.getByRole('region', { name: `${oldName} column` })
  await expect(statusColumn).toBeVisible()

  await statusColumn.getByRole('button', { name: `Đổi tên trạng thái ${oldName}` }).click()
  await expect(page.getByRole('heading', { name: 'Đổi tên trạng thái' })).toBeVisible()

  const renameInput = page.locator('#rename-status-name')
  await renameInput.fill(newName)
  await expect(renameInput).toHaveValue(newName)
  await expect(page.getByRole('heading', { name: 'Đổi tên trạng thái' })).toBeVisible()

  await Promise.all([
    page.waitForResponse(
      (networkResponse) =>
        networkResponse.url().includes('/api/v1/task-statuses') &&
        networkResponse.request().method() === 'PATCH' &&
        networkResponse.status() === 200
    ),
    page.getByRole('button', { name: 'Lưu tên', exact: true }).click(),
  ])

  await expect(page.getByRole('heading', { name: 'Đổi tên trạng thái' })).toBeHidden()
  await expect(page.getByRole('region', { name: `${newName} column` })).toBeVisible()
  await screenshot(page, '02-renamed-status-column')
}

async function dragStatusBeforeTodo(page: Page, statusName: string) {
  const statusColumn = page.getByRole('region', { name: `${statusName} column` })
  const todoColumn = page.getByRole('region', { name: 'TODO column' })

  await expect(statusColumn).toBeVisible()
  await expect(todoColumn).toBeVisible()

  const sourceHandle = statusColumn.getByRole('button', {
    name: 'Kéo để đổi vị trí cột trạng thái',
  })
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer())
  const reorderResponse = page.waitForResponse(
    (networkResponse) =>
      networkResponse.url().includes('/api/v1/task-statuses') &&
      networkResponse.request().method() === 'PATCH' &&
      networkResponse.status() === 200
  )
  await sourceHandle.dispatchEvent('dragstart', { dataTransfer })
  await todoColumn.dispatchEvent('dragover', { dataTransfer })
  await todoColumn.dispatchEvent('drop', { dataTransfer })
  await sourceHandle.dispatchEvent('dragend', { dataTransfer })
  await reorderResponse

  await expect(page.getByRole('region', { name: `${statusName} column` })).toBeVisible()
}

async function visibleColumnNames(page: Page): Promise<string[]> {
  return page.locator('section[aria-label$=" column"]').evaluateAll((nodes) =>
    nodes
      .map((node) => node.getAttribute('aria-label') ?? '')
      .filter(Boolean)
      .map((label) => label.replace(/ column$/, ''))
  )
}

test.describe('Org task status workflow', () => {
  test.beforeAll(() => {
    mkdirSync(SCREENSHOT_DIR, { recursive: true })
  })

  test('manager creates, renames, and reorders task statuses from org board', async ({ page }) => {
    const browserErrors: string[] = []
    page.on('pageerror', (error) => browserErrors.push(error.message))

    const seed = await seedTaskWorkflow(page)
    await login(page, seed.ownerEmail, { organizationId: seed.organizationId })

    await page.goto(`${BASE_URL}/org/tasks/board?project_id=${seed.projectId}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('region', { name: 'Board task tổ chức' })).toBeVisible()

    const statusName = `E2E Flow ${Date.now()}`
    const renamedStatus = `${statusName} Renamed`

    await createStatus(page, statusName)
    await renameStatus(page, statusName, renamedStatus)
    await dragStatusBeforeTodo(page, renamedStatus)

    await page.reload()
    await page.waitForLoadState('networkidle')

    const namesAfterReload = await visibleColumnNames(page)
    expect(namesAfterReload.slice(0, 2)).toEqual([renamedStatus, 'TODO'])
    await screenshot(page, '03-reordered-status-persists-after-reload')

    expect(browserErrors).toEqual([])
  })
})
