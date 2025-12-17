import { test, expect } from '@playwright/test'
import { scanOptionalCriticalPaths } from '../../../scripts/tests/scan_playwright_optional_paths.mjs'

test('critical marketplace and review specs do not contain optional-path guards', async () => {
  const offenders = await scanOptionalCriticalPaths([
    'tests/e2e/task-application-triage.spec.ts',
    'tests/e2e/staffing-flow.spec.ts',
  ])

  expect(offenders).toEqual([])
})
