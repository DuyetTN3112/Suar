import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { test, expect } from '@playwright/test'

const TMP_POLICY_DIR = 'tmp/false-pass-policy-fixture'

test('E2E specs do not add false-pass patterns beyond explicit debt allowlist', async () => {
  const modulePath = '../../../../../../scripts/tests/scan_false_pass_patterns.mjs'
  const { scanFalsePassPatterns } = (await import(modulePath)) as {
    scanFalsePassPatterns: (
      policyPath: string
    ) => Promise<{ file: string; pattern: string }[]>
  }
  const offenders = await scanFalsePassPatterns('scripts/tests/critical_e2e_policy.json')
  expect(offenders).toEqual([])
})

test('false-pass scanner supports globbed specs and regex behavior patterns', async () => {
  const modulePath = '../../../../../../scripts/tests/scan_false_pass_patterns.mjs'
  const { scanFalsePassPatterns } = (await import(modulePath)) as {
    scanFalsePassPatterns: (
      policyPath: string
    ) => Promise<{ file: string; pattern: string }[]>
  }

  await rm(TMP_POLICY_DIR, { recursive: true, force: true })
  await mkdir(join(TMP_POLICY_DIR, 'specs'), { recursive: true })

  await writeFile(
    join(TMP_POLICY_DIR, 'specs', 'weak_non_critical.spec.ts'),
    [
      "const hasRows = await page.locator('tbody tr').count() > 0",
      "const hasEmptyState = await page.locator('text=Empty').count() > 0",
      'expect(hasRows || hasEmptyState).toBeTruthy()',
    ].join('\n')
  )
  await writeFile(
    join(TMP_POLICY_DIR, 'policy.json'),
    JSON.stringify(
      {
        includeGlobs: [`${TMP_POLICY_DIR}/specs/**/*.spec.ts`],
        forbiddenRegexPatterns: [
          {
            id: 'optional-content-or-empty-state',
            regex: 'expect\\([^\\n]+\\|\\|[^\\n]+Empty[^\\n]+\\)\\.toBeTruthy\\(\\)',
          },
        ],
      },
      null,
      2
    )
  )

  const offenders = await scanFalsePassPatterns(`${TMP_POLICY_DIR}/policy.json`)

  await rm(TMP_POLICY_DIR, { recursive: true, force: true })

  expect(offenders).toEqual([
    {
      file: `${TMP_POLICY_DIR}/specs/weak_non_critical.spec.ts`,
      pattern: 'optional-content-or-empty-state',
    },
  ])
})
