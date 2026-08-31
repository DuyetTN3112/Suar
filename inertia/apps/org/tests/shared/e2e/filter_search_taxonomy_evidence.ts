import { expect, type Page, type TestInfo } from '@playwright/test'

export interface FilterSearchTaxonomyEvidenceInput {
  journeyId: string
  actor: string
  route: string
  criteria: Record<string, unknown>
  backend: {
    status: number
    consequence: string
    responseContract: string
  }
  result: {
    count: number
    visibleState: string
  }
  screenshotPath: string
}

/**
 * Captures evidence only after the caller has verified the UI and backend
 * consequence. This deliberately does not call an API to manufacture a
 * result: the screenshot is taken from the page reached through the UI.
 */
export async function captureFilterSearchTaxonomyEvidence(
  page: Page,
  testInfo: TestInfo,
  input: FilterSearchTaxonomyEvidenceInput
): Promise<void> {
  expect(input.journeyId).toMatch(/^RP-FST-[0-9]{2}$/)
  expect(input.actor.length).toBeGreaterThan(0)
  expect(input.route.startsWith('/')).toBe(true)
  expect(input.backend.status).toBeGreaterThanOrEqual(200)
  expect(input.backend.status).toBeLessThan(400)
  expect(input.backend.consequence.length).toBeGreaterThan(0)
  expect(input.backend.responseContract.length).toBeGreaterThan(0)
  expect(input.result.count).toBeGreaterThanOrEqual(0)
  expect(input.result.visibleState.length).toBeGreaterThan(0)

  await page.screenshot({ path: input.screenshotPath, fullPage: true })
  await testInfo.attach(`${input.journeyId}-evidence.json`, {
    body: JSON.stringify(
      {
        ...input,
        capturedAt: new Date().toISOString(),
        screenshot: input.screenshotPath,
      },
      null,
      2
    ),
    contentType: 'application/json',
  })
}
