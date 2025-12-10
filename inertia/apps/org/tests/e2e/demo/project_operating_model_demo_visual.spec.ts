import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { test, expect, type Page } from '@playwright/test'

import { ensurePersonaSession } from '../../shared/e2e/fixtures/auth_personas.js'
import { seedProjectMemberFlow } from '../../shared/e2e/support/seeded_project_member_flow.js'

const SCREENSHOT_DIR = resolve('test-results/e2e-visual/project-operating-model-demo')

async function sectionScreenshot(page: Page, selector: string, name: string) {
  const path = resolve(SCREENSHOT_DIR, `${name}.png`)
  mkdirSync(dirname(path), { recursive: true })
  const surface = page.locator(selector).first()
  await surface.evaluate((element) => {
    element.scrollIntoView({ block: 'center', inline: 'nearest' })
  })
  await page.evaluate(
    () =>
      new Promise<void>((resolvePaint) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolvePaint()))
      })
  )
  await page.addStyleTag({
    content: '*[data-demo-hide-fixed], [data-demo-hide-fixed] * { visibility: hidden !important; }',
  })
  await page.evaluate(() => {
    for (const element of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const position = window.getComputedStyle(element).position
      if (position === 'fixed' || position === 'sticky') {
        element.dataset.demoHideFixed = 'true'
      }
    }
  })
  await surface.screenshot({ path })
}

test.describe('Project operating model demo visual audit', () => {
  test('captures owner project-to-task inheritance surfaces', async ({ page }) => {
    const seeded = await seedProjectMemberFlow(page, { demoNames: true })
    await ensurePersonaSession(page, seeded.ownerEmail, seeded.organizationId)

    await page.goto(`/org/projects/${seeded.projectId}?focus=operating_model`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /^Operating Model$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Preset tạo task$/i })).toBeVisible()
    await expect(page.getByText(/Task Factory/i)).toBeVisible()
    await expect(page.getByText(/Skill ranges/i)).toBeVisible()
    await expect(page.getByText(/QA Strategy/i)).toBeVisible()
    await expect(page.getByText(/L3-L7/i).first()).toBeVisible()
    await sectionScreenshot(
      page,
      '[data-demo-section="project-operating-model"]',
      '01-project-operating-model'
    )

    await page.goto(`/org/projects/${seeded.projectId}?focus=skills`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/TypeScript QA Automation/i)).toBeVisible()
    await expect(page.getByText(/QA Strategy/i)).toBeVisible()
    await expect(page.getByText(/Clear Communication/i)).toBeVisible()
    await expect(page.getByText(/Release Ownership/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Công nghệ$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Kỹ thuật phần mềm$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Kỹ năng mềm$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Thực thi$/i })).toBeVisible()
    await sectionScreenshot(
      page,
      '[data-demo-section="project-skills-catalog"]',
      '02-project-skills-catalog'
    )

    await page.goto(`/org/projects/${seeded.projectId}?focus=roles`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('link', { name: /Tạo task/i })).toBeVisible()
    await expect(page.getByText(/QA Engineer/i)).toBeVisible()
    await expect(page.getByText(/Skills \(4\)/i)).toBeVisible()
    await expect(page.getByText(/QA Strategy/i)).toBeVisible()
    await expect(page.getByText(/Clear Communication/i)).toBeVisible()
    await expect(page.getByText(/Release Ownership/i)).toBeVisible()
    await expect(page.getByText(/L3-L7/i).first()).toBeVisible()
    await sectionScreenshot(
      page,
      '[data-demo-section="project-roles-staffing"]',
      '03-project-roles-staffing'
    )

    const createTaskHref = await page
      .getByRole('link', { name: /Tạo task/i })
      .first()
      .getAttribute('href')
    if (!createTaskHref) {
      throw new Error('Missing create task href')
    }
    await page.goto(createTaskHref)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('combobox', { name: /Apply by role|Áp theo role/i })
    ).toContainText(/QA Engineer/i)
    await page.getByRole('tab', { name: /^Skills$/i }).click()
    await expect(page.locator('span.font-medium', { hasText: 'QA Strategy' }).first()).toBeVisible()
    await expect(
      page.locator('span.font-medium', { hasText: 'Clear Communication' }).first()
    ).toBeVisible()
    await expect(
      page.locator('span.font-medium', { hasText: 'Release Ownership' }).first()
    ).toBeVisible()
    await expect(page.getByText(/Range L3 - L7/i).first()).toBeVisible()
    await expect(
      page
        .getByText(/Gợi ý assignee/i)
        .or(page.getByText(/Suggested assignee/i))
        .or(page.getByText(/Chưa có assignee phù hợp/i))
    ).toBeVisible()
    await sectionScreenshot(
      page,
      '[data-demo-section="task-skills-field"]',
      '04-task-inherited-contract'
    )

    const technologyCard = page
      .locator('section', { has: page.getByLabel('Tìm skill Công nghệ') })
      .first()
    await page.getByLabel('Tìm skill Công nghệ').fill('Security Testing')
    await expect(technologyCard.getByRole('button', { name: 'Thêm Công nghệ' })).toBeEnabled()
    await technologyCard.getByRole('button', { name: 'Thêm Công nghệ' }).click()
    await expect(
      page.locator('span.font-medium', { hasText: 'Security Testing' }).first()
    ).toBeVisible()
    await expect(page.getByText(/5 skills/i)).toBeVisible()
    await sectionScreenshot(
      page,
      '[data-demo-section="task-skills-field"]',
      '05-task-custom-skill-added'
    )
  })
})
