import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { test } from '@japa/runner'

const CONTROLLERS = [
  'list_ai_dispute_evaluations_controller.ts',
  'resolve_review_dispute_controller.ts',
  'list_review_dispute_case_files_controller.ts',
  'create_review_dispute_controller.ts',
  'list_admin_review_disputes_controller.ts',
] as const

test.group('Unit | Dispute controller orchestration boundary', () => {
  for (const controller of CONTROLLERS) {
    test(`${controller} delegates one business intent`, async ({ assert }) => {
      const source = await readFile(
        join(process.cwd(), 'app/modules/disputes/controllers', controller),
        'utf8'
      )
      const factoryCalls = source.match(/\.make[A-Z][A-Za-z0-9]*(?:Command|Query)\(/gu)?.length ?? 0

      assert.equal(factoryCalls, 1)
      assert.notInclude(source, 'makeWorkflowNavigationQuery')
    })
  }
})
