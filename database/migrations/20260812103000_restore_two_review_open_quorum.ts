import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * A task giver must review, while a second review is collected from the
 * project community. The second reviewer is never pre-assigned, but the
 * workflow cannot advance before two reviews have been submitted.
 */
export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`
      DELETE FROM task_review_reviewers AS reviewer
      WHERE reviewer.reviewer_role = 'peer_voluntary'
        AND reviewer.status = 'pending';

      UPDATE task_review_reviewers
      SET reviewer_role = 'project_member_reviewer'
      WHERE reviewer_role = 'peer_voluntary';

      UPDATE task_review_workflows
      SET required_review_count = 2
      WHERE status IN ('awaiting_review', 'in_review', 'awaiting_response', 'disputed');
    `)
  }

  override async down(): Promise<void> {
    // Never reduce the quorum: a task review requires two submitted reviews.
  }
}
