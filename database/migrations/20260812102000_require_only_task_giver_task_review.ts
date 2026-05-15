import { BaseSchema } from '@adonisjs/lucid/schema'

/** A task giver is the only mandatory reviewer; all other project reviews are voluntary. */
export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`
      UPDATE task_review_workflows AS workflow
      SET required_review_count = 1
      WHERE EXISTS (
        SELECT 1
        FROM task_review_reviewers AS reviewer
        WHERE reviewer.workflow_id = workflow.id
          AND reviewer.reviewer_role = 'task_giver_required'
          AND reviewer.is_required = true
      )
      AND NOT EXISTS (
        SELECT 1
        FROM task_review_reviewers AS reviewer
        WHERE reviewer.workflow_id = workflow.id
          AND reviewer.is_required = true
          AND reviewer.reviewer_role <> 'task_giver_required'
      );
    `)
  }

  override async down(): Promise<void> {
    // Do not restore a mandatory peer-review quorum that never matched policy.
  }
}
