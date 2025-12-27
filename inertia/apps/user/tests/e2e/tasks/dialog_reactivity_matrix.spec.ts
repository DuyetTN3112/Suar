import { test, expect, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE = 'http://127.0.0.1:3333'
const E2E_USER = 'tranngocduyet31@gmail.com'

function createStatusButton(page: Page) {
  return page.locator('[aria-label="Thêm trạng thái mới"]')
}

function createDialog(page: Page) {
  return page.getByRole('heading', { name: 'Them trang thai moi', exact: true })
}

async function openCreateStatusDialog(page: Page) {
  await createStatusButton(page).click()
  await expect(createDialog(page)).toBeVisible()
  await expect(page.locator('#status-name')).toBeVisible()
}

async function openCategorySelect(page: Page) {
  await page.getByRole('button', { name: 'Chon nhom trang thai', exact: true }).click()
}

async function selectCategory(
  page: Page,
  optionValue = 'todo',
  optionLabel = 'Todo: Chua bat dau'
) {
  await openCategorySelect(page)
  await expect(page.locator(`[data-value="${optionValue}"]:visible`)).toBeVisible()
  await page.locator(`[data-value="${optionValue}"]:visible`).click()
  await expect(page.getByRole('button', { name: optionLabel, exact: true })).toBeVisible()
}

async function createCustomStatus(page: Page, statusName: string) {
  await openCreateStatusDialog(page)

  await page.locator('#status-name').fill(statusName)
  await selectCategory(page)

  const response = await Promise.all([
    page.waitForResponse((networkResponse) =>
      networkResponse.url().includes('/api/v1/task-statuses') &&
      networkResponse.request().method() === 'POST' &&
      networkResponse.status() === 201
    ),
    page.locator('button:has-text("Tao trang thai"):visible').click(),
  ])

  await expect(createDialog(page)).toBeHidden()

  const payload = (await response[0].json()) as { data?: { id?: string } }
  return payload.data?.id ?? null
}

async function deleteStatusById(page: Page, statusId: string) {
  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  const response = await page.request.delete(`${BASE}/api/v1/task-statuses/${statusId}`, {
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': csrfToken ?? '',
    },
  })
  expect(response.ok()).toBeTruthy()
}

async function navigateToTaskBoard(page: Page) {
  await page.goto(`${BASE}/org/tasks`)
  await page.waitForLoadState('networkidle')
  await expect(createStatusButton(page)).toBeVisible()
}

test.describe('Dialog Reactivity Matrix', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
    await navigateToTaskBoard(page)
  })

  test('HC-01: Create status dialog opens when button clicked', async ({ page }) => {
    await openCreateStatusDialog(page)
  })

  test('HC-02: Create status dialog closes when cancel clicked', async ({ page }) => {
    await openCreateStatusDialog(page)

    await page.locator('button:has-text("Huy"):visible').click()
    await expect(createDialog(page)).toBeHidden()
  })

  test('HC-03: Successful submit closes dialog and returns created status id', async ({ page }) => {
    const statusName = `E2E Delete ${Date.now()}`
    const statusId = await createCustomStatus(page, statusName)
    expect(statusId).toBeTruthy()
    if (statusId) {
      await deleteStatusById(page, statusId)
    }
  })

  test('HC-04: Dialog form accepts input', async ({ page }) => {
    await openCreateStatusDialog(page)

    const nameInput = page.locator('#status-name')
    await nameInput.fill('Test Status Dialog')
    await expect(nameInput).toHaveValue('Test Status Dialog')
  })

  test('HC-05: Dialog category select works', async ({ page }) => {
    await openCreateStatusDialog(page)
    await selectCategory(page, 'in_progress', 'In progress: Dang thuc hien')
  })

  test('UH-01: Dialog does not open without user interaction', async ({ page }) => {
    await expect(createDialog(page)).toBeHidden()
  })

  test('UH-02: Clicking outside dialog does not crash page', async ({ page }) => {
    await openCreateStatusDialog(page)
    await page.mouse.click(8, 8)
    await expect(createStatusButton(page)).toBeVisible()
  })

  test('UH-03: Multiple rapid clicks do not break dialog state', async ({ page }) => {
    const button = createStatusButton(page)
    await button.click()
    await button.click({ force: true })
    await button.click({ force: true })

    await expect(createDialog(page)).toBeVisible()
    await expect(page.locator('h2:visible')).toHaveCount(1)
  })

  test('UH-04: Dialog does not submit empty required fields', async ({ page }) => {
    await openCreateStatusDialog(page)

    await page.locator('button:has-text("Tao trang thai"):visible').click()

    await expect(page.getByText('Tên trạng thái là bắt buộc', { exact: true })).toBeVisible()
    await expect(createDialog(page)).toBeVisible()
  })

  test('UH-05: Console has no Svelte reactivity errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await openCreateStatusDialog(page)
    await page.locator('button:has-text("Huy"):visible').click()
    await expect(createDialog(page)).toBeHidden()

    const svelteErrors = consoleErrors.filter((error) =>
      error.includes('reactivity') || error.includes('prop') || error.includes('undefined')
    )
    expect(svelteErrors).toHaveLength(0)
  })

  test('UH-06: Dialog state resets after close and reopen', async ({ page }) => {
    await openCreateStatusDialog(page)

    const dialog = createDialog(page)
    const nameInput = page.locator('#status-name')
    await nameInput.fill('Should Be Cleared')
    await page.locator('button:has-text("Huy"):visible').click()
    await expect(dialog).toBeHidden()

    await openCreateStatusDialog(page)
    await expect(page.locator('#status-name')).toHaveValue('')
  })

  test('UH-07: Delete affordance remains visible for deletable columns', async ({ page }) => {
    const statusName = `E2E Delete Visible ${Date.now()}`
    const statusId = await createCustomStatus(page, statusName)
    expect(statusId).toBeTruthy()

    await page.goto(`${BASE}/org/tasks`)
    await page.waitForLoadState('networkidle')

    const customStatusColumn = page.getByRole('region', { name: `${statusName} column` })
    await expect(customStatusColumn).toBeVisible()
    await expect(customStatusColumn.getByRole('button', { name: 'Xoá trạng thái' })).toBeVisible()

    if (statusId) {
      await deleteStatusById(page, statusId)
    }
  })

  test('UH-08: Dialog color picker is interactive', async ({ page }) => {
    await openCreateStatusDialog(page)

    const colorInput = page.locator('input[type="color"]')
    await colorInput.fill('#123456')
    await expect(colorInput).toHaveValue('#123456')
  })

  test('UH-09: Dialog description field accepts input', async ({ page }) => {
    await openCreateStatusDialog(page)

    const descriptionInput = page.locator('#status-description')
    await descriptionInput.fill('Test description')
    await expect(descriptionInput).toHaveValue('Test description')
  })

  test('UH-10: Fake-pass detection — invalid trigger does not open dialog', async ({ page }) => {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('open-dialog', { detail: null }))
    })

    await expect(createDialog(page)).toBeHidden()
  })

  test('UH-11: Page does not crash when navigating away while dialog is open', async ({ page }) => {
    await openCreateStatusDialog(page)
    await page.goto(`${BASE}/org`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/\/org$/)
  })

  test('UH-12: Escape key does not crash dialog state', async ({ page }) => {
    await openCreateStatusDialog(page)
    await page.keyboard.press('Escape')
    await expect(createStatusButton(page)).toBeVisible()
    await expect(page.locator('h2:visible')).toHaveCount(1)
  })

  test('UH-13: Enter key on name input keeps page interactive', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await openCreateStatusDialog(page)

    await page.locator('#status-name').fill('Enter Submit Test')
    await page.locator('#status-name').press('Enter')

    await expect(createStatusButton(page)).toBeVisible()
    const crashErrors = consoleErrors.filter((error) =>
      error.includes('Cannot read properties of undefined') ||
      error.includes('is not a function')
    )
    expect(crashErrors).toHaveLength(0)
  })

  test('UH-14: No runtime crash errors during open-close cycle', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await openCreateStatusDialog(page)
    await page.locator('button:has-text("Huy"):visible').click()
    await expect(createDialog(page)).toBeHidden()

    const crashErrors = consoleErrors.filter((error) =>
      error.includes('Cannot read properties of undefined') ||
      error.includes('is not a function')
    )
    expect(crashErrors).toHaveLength(0)
  })

  test('UH-15: Dialog opens consistently across multiple reopen cycles', async ({ page }) => {
    for (let index = 0; index < 3; index += 1) {
      await openCreateStatusDialog(page)
      await page.locator('button:has-text("Huy"):visible').click()
      await expect(createDialog(page)).toBeHidden()
    }
  })
})
