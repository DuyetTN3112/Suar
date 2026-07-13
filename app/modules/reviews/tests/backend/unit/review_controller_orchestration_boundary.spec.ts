import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { test } from '@japa/runner'

const CONTROLLERS = [
  'task-review/show_task_review_board_controller.ts',
  'sprint-review/accept_sprint_reverse_review_workflow_controller.ts',
  'sprint-review/report_sprint_reverse_review_workflow_controller.ts',
  'sprint-review/respond_sprint_reverse_review_workflow_controller.ts',
  'sprint-review/submit_sprint_reverse_review_workflow_controller.ts',
  'task-review/accept_task_review_workflow_controller.ts',
  'task-review/open_task_review_dispute_workflow_controller.ts',
  'task-review/report_task_review_workflow_controller.ts',
  'task-review/respond_task_review_workflow_controller.ts',
  'task-review/submit_task_review_workflow_controller.ts',
  'review-submission/create_reverse_review_controller.ts',
  'disputes/list_ai_dispute_evaluations_controller.ts',
  'sprint-review/close_project_sprint_review_period_controller.ts',
  'review-core/add_review_evidence_controller.ts',
  'disputes/resolve_review_dispute_controller.ts',
  'sprint-review/expire_sprint_review_packages_controller.ts',
  'review-core/confirm_review_controller.ts',
  'disputes/list_review_dispute_case_files_controller.ts',
  'self-assessment/upsert_task_self_assessment_controller.ts',
  'disputes/create_review_dispute_controller.ts',
  'disputes/list_admin_review_disputes_controller.ts',
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
