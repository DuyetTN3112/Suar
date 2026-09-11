import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { test, expect } from '@playwright/test'

import { login, seedTaskCreateFlow } from '../../shared/e2e/helpers.js'

const SCREENSHOT_DIR = resolve('test-results/e2e-visual/task-authoring-draft')

test.describe('Task authoring draft role-play', () => {
  test('creator can save an incomplete local draft from the project board without creating a task', async ({ page }) => {
    const seeded = await seedTaskCreateFlow(page)
    await login(page, seeded.ownerEmail)

    await page.goto(`/projects/${seeded.projectId}/tasks?create=1`)
    await expect(page.getByRole('heading', { name: /^(New Task|Tạo nhiệm vụ mới)$/i }).last()).toBeVisible()
    await expect(page.locator('[data-testid="task-create-readiness"]')).toHaveCount(0)

    await page.fill('input[name="title"]', 'Draft authoring role-play')
    await page.getByRole('tab', { name: /Acceptance/i }).click()
    const saveDraftButton = page.getByRole('button', { name: 'Save draft', exact: true })
    await expect(saveDraftButton).toBeVisible()
    await page.fill('#scope_text', 'Define the bounded scope')
    mkdirSync(SCREENSHOT_DIR, { recursive: true })
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, '01-draft-authoring-form.png'), fullPage: true })

    const taskCreateRequests: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && /\/tasks$/.test(request.url())) taskCreateRequests.push(request.url())
    })
    await saveDraftButton.click()
    await expect(page.getByRole('heading', { name: /^(New Task|Tạo nhiệm vụ mới)$/i }).last()).toBeHidden()
    expect(taskCreateRequests).toEqual([])

    await page.getByRole('button', { name: /New task|Tạo task/i }).click()
    await expect(page.locator('input[name="title"]')).toHaveValue('Draft authoring role-play')
    await expect(page.locator('#scope_text')).toHaveValue('Define the bounded scope')
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, '02-draft-restored-in-modal.png'), fullPage: true })
  })

  test('link-only draft stays blocked from publish and assignment', async ({ page }) => {
    const seeded = await seedTaskCreateFlow(page)
    await login(page, seeded.ownerEmail)

    await page.goto(`/projects/${seeded.projectId}/tasks?create=1`)
    await expect(page.getByRole('heading', { name: /^(New Task|Tạo nhiệm vụ mới)$/i }).last()).toBeVisible()
    await page.fill('input[name="title"]', 'Link-only draft remains unverifiable')
    await page.getByRole('tab', { name: /Acceptance/i }).click()
    await page.fill('#supporting_reference_uri', 'https://notion.example/private-api-design')
    await page.fill('#supporting_reference_title', 'Private design reference')

    await expect(page.locator('[data-testid="task-create-readiness"]')).toHaveCount(0)
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, 'link-only-validation-blocked.png'), fullPage: true })

    const taskCreateRequests: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && /\/tasks$/.test(request.url())) taskCreateRequests.push(request.url())
    })
    const publishButton = page.getByRole('button', { name: /Publish and assign|Create and assign/i }).last()
    await expect(publishButton).toBeVisible()
    await publishButton.click()

    await expect(page.locator('[data-testid="task-create-validation-summary"]')).toBeVisible()
    await expect(page.locator('#assigned-to-field')).toHaveAttribute('aria-invalid', 'true')
    expect(taskCreateRequests).toEqual([])
  })

  test('creator can publish an evidence-enabled task with one relevant capability', async ({ page }) => {
    const seeded = await seedTaskCreateFlow(page)
    await login(page, seeded.ownerEmail)

    await page.goto(`/projects/${seeded.projectId}/tasks?create=1`)
    await expect(page.getByRole('heading', { name: /^(New Task|Tạo nhiệm vụ mới)$/i }).last()).toBeVisible()

    await page.fill('input[name="title"]', 'Published relevant capability task')
    await expect(page.locator('#task_status_id')).toContainText(/TODO/i)

    const assigneeField = page.locator('#assigned-to-field')
    await assigneeField.getByRole('button').first().click()
    await page.locator('[data-value]:visible').filter({ hasText: seeded.assigneeUsername }).click()

    const roleField = page.locator('#role_in_task')
    await roleField.click()
    await page.locator('[data-value]:visible').nth(1).click()
    await page.fill('#description', 'The project needs a stable API boundary.')

    await page.getByRole('tab', { name: /Skills|Kỹ năng/i }).click()
    await page.fill('#skill-search-technology', 'API design')
    const technologySkillOption = page.locator('#skill-select-technology option').filter({ hasText: /API design/i }).first()
    const technologySkillId = await technologySkillOption.getAttribute('value')
    if (!technologySkillId) throw new Error('Expected seeded technology skill with rubric')
    await page.selectOption('#skill-select-technology', technologySkillId)
    await page.getByRole('button', { name: /Add Technology/i }).click()

    await page.getByRole('tab', { name: /Requirements & acceptance|Acceptance/i }).click()
    await expect(page.locator('#scope_text')).toBeVisible()
    await page.fill('#acceptance_criteria', 'The API design is reviewed and documented.')
    await page.fill('#scope_text', 'API boundary and request contract')
    await page.fill('#out_of_scope_text', 'Production rollout')
    await page.fill('#deliverables_text', 'Reviewed API contract document')
    await page.fill('#quality_requirements_text', 'Backward-compatible and testable')
    await page.fill('#constraints_text', 'Use the existing HTTP boundary')
    await page.fill('#dependencies_text', 'Project owner review')
    const reviewerSelect = page.locator('#reviewer_user_id')
    const reviewerId = await reviewerSelect.locator('option:not([value=""])').first().getAttribute('value')
    if (!reviewerId) throw new Error('Expected an eligible reviewer different from the assignee')
    await reviewerSelect.selectOption(reviewerId)
    await page.locator('#creator_confirmed').check()

    mkdirSync(SCREENSHOT_DIR, { recursive: true })
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, '03-evidence-publish-form.png'), fullPage: true })
    const createRequestPromise = page.waitForRequest(
      (request) => request.method() === 'POST' && /\/tasks$/.test(request.url())
    )
    const createResponsePromise = page.waitForResponse(
      (response) => response.request().method() === 'POST' && /tasks/.test(response.url())
    )
    await page.getByRole('button', { name: /Publish and assign|Create and assign/i }).click()
    const createRequest = await createRequestPromise
    const requestBody = createRequest.postDataJSON() as { parentTaskId?: string | null }
    expect(requestBody.parentTaskId ?? null).toBeNull()
    const createResponse = await createResponsePromise
    const createBody = await createResponse.text()
    expect(createResponse.ok(), createBody).toBe(true)
    const createdPayload = JSON.parse(createBody) as { data?: { id?: string } }
    const createdTaskId = createdPayload.data?.id
    if (!createdTaskId) throw new Error('Expected create response to include task id')

    await expect(page).toHaveURL(new RegExp(`/projects/${seeded.projectId}/tasks`))
    await expect(page.getByText('Published relevant capability task', { exact: true })).toBeVisible()
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, '04-evidence-published-board.png'), fullPage: true })

    await page.context().clearCookies()
    await login(page, seeded.assigneeEmail, { organizationId: seeded.organizationId })
    const assigneeBoardResponse = await page.goto(`/tasks?task_id=${createdTaskId}`)
    await page.waitForLoadState('domcontentloaded')
    expect(assigneeBoardResponse?.ok()).toBe(true)
    await expect(page.locator('[data-testid="task-drawer-work-surfaces"]')).toBeVisible()
    const resolvedBrief = page.locator('[data-testid="resolved-brief"]')
    await expect(resolvedBrief).toBeVisible()
    await expect(resolvedBrief).toContainText('Reviewed API contract document')
    await expect(resolvedBrief).toContainText('The API design is reviewed and documented.')
    await expect(resolvedBrief).toContainText('sole_contributor')
    await resolvedBrief.screenshot({
      path: resolve(SCREENSHOT_DIR, '05-assignee-resolved-brief.png'),
    })
  })
})
