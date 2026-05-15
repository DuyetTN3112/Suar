import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Task reviews require the task giver plus one voluntary peer review. Pending
 * named reviewers from the old assignment model must not block that quorum.
 */
export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`
      DELETE FROM task_review_reviewers AS reviewer
      USING task_review_workflows AS workflow
      WHERE reviewer.workflow_id = workflow.id
        AND reviewer.status = 'pending'
        AND reviewer.reviewer_role <> 'task_giver_required'
        AND workflow.status IN ('awaiting_review', 'in_review');

      UPDATE task_review_workflows
      SET required_review_count = 2
      WHERE status IN ('awaiting_review', 'in_review');
    `)
  }

  override async down(): Promise<void> {
    // Removed pending assignments are intentionally not recreated.
  }
}
