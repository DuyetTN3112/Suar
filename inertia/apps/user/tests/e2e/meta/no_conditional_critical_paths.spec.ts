import { test, expect } from '@playwright/test'

test('critical marketplace and review specs do not contain optional-path guards', async () => {
  const modulePath = '../../../../../../scripts/tests/scan_playwright_optional_paths.mjs'
  const { scanOptionalCriticalPaths } = (await import(modulePath)) as {
    scanOptionalCriticalPaths: (paths: string[]) => Promise<string[]>
  }
  const offenders = await scanOptionalCriticalPaths([
    'inertia/apps/user/tests/e2e/marketplace/apply_withdraw_my_applications.spec.ts',
    'inertia/apps/user/tests/e2e/tasks/match_score_explainability.spec.ts',
    'inertia/apps/org/tests/e2e/projects/staffing_flow.spec.ts',
  ])

  expect(offenders).toEqual([])
})
