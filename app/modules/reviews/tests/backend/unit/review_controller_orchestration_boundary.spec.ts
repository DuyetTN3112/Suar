import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { test } from '@japa/runner'

const CONTROLLERS = [
  'show_task_review_board_controller.ts',
  'accept_sprint_reverse_review_workflow_controller.ts',
  'report_sprint_reverse_review_workflow_controller.ts',
  'respond_sprint_reverse_review_workflow_controller.ts',
  'submit_sprint_reverse_review_workflow_controller.ts',
  'accept_task_review_workflow_controller.ts',
  'report_task_review_workflow_controller.ts',
  'respond_task_review_workflow_controller.ts',
  'submit_task_review_workflow_controller.ts',
  'create_reverse_review_controller.ts',
  'list_ai_dispute_evaluations_controller.ts',
  'close_project_sprint_review_period_controller.ts',
  'add_review_evidence_controller.ts',
  'resolve_review_dispute_controller.ts',
  'expire_sprint_review_packages_controller.ts',
  'confirm_review_controller.ts',
  'list_review_dispute_case_files_controller.ts',
  'upsert_task_self_assessment_controller.ts',
  'create_review_dispute_controller.ts',
  'list_admin_review_disputes_controller.ts',
] as const

test.group('Unit | Review controller orchestration boundary', () => {
  for (const controller of CONTROLLERS) {
    test(`${controller} delegates one business intent`, async ({ assert }) => {
      const source = await readFile(
        join(process.cwd(), 'app/modules/reviews/controllers', controller),
        'utf8'
      )
      const factoryCalls = source.match(/\.make[A-Z][A-Za-z0-9]*(?:Command|Query)\(/gu)?.length ?? 0

      assert.equal(factoryCalls, 1)
      assert.notInclude(source, 'makeWorkflowNavigationQuery')
    })
  }
})
