import { test, expect } from '@playwright/test'

// @ts-expect-error - JS module without types
import { scanOptionalCriticalPaths } from '../../../scripts/tests/scan_playwright_optional_paths.mjs'

test('critical marketplace and review specs do not contain optional-path guards', async () => {
  const scan = scanOptionalCriticalPaths as unknown as (paths: string[]) => Promise<string[]>
  const offenders = await scan([
    'tests/e2e/task-application-triage.spec.ts',
    'tests/e2e/staffing-flow.spec.ts',
  ])

  expect(offenders).toEqual([])
})
