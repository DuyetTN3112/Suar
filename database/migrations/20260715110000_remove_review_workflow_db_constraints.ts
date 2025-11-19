import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up() {
    await this.dropConstraints('task_review_workflows', [
      'task_review_workflows_task_id_unique',
      'task_review_workflows_status_check',
      'task_review_workflows_required_review_count_check',
      'task_review_workflows_completed_review_count_check',
      'task_review_workflows_task_id_fkey',
      'task_review_workflows_project_id_fkey',
      'task_review_workflows_organization_id_fkey',
      'task_review_workflows_reviewee_id_fkey',
      'task_review_workflows_reported_by_fkey',
    ])

    await this.dropConstraints('task_review_reviewers', [
      'task_review_reviewers_workflow_reviewer_unique',
      'task_review_reviewers_role_check',
      'task_review_reviewers_status_check',
      'task_review_reviewers_workflow_id_fkey',
      'task_review_reviewers_reviewer_id_fkey',
    ])

    await this.dropConstraints('task_review_messages', [
      'task_review_messages_type_check',
      'task_review_messages_workflow_id_fkey',
      'task_review_messages_author_id_fkey',
    ])

    await this.dropConstraints('sprint_reverse_review_workflows', [
      'sprint_reverse_review_workflows_target_check',
      'sprint_reverse_review_workflows_status_check',
      'sprint_reverse_review_workflows_rating_check',
      'sprint_reverse_review_workflows_unique_target',
      'sprint_reverse_review_workflows_sprint_id_fkey',
      'sprint_reverse_review_workflows_project_id_fkey',
      'sprint_reverse_review_workflows_organization_id_fkey',
      'sprint_reverse_review_workflows_reviewer_id_fkey',
      'sprint_reverse_review_workflows_target_user_id_fkey',
      'sprint_reverse_review_workflows_responder_id_fkey',
      'sprint_reverse_review_workflows_package_id_fkey',
    ])

    await this.dropConstraints('sprint_reverse_review_messages', [
      'sprint_reverse_review_messages_type_check',
      'sprint_reverse_review_messages_workflow_id_fkey',
      'sprint_reverse_review_messages_author_id_fkey',
    ])
  }

  override async down() {
    // Intentional no-op. Review workflow relationship and rule validation belongs
    // in application services, not in database constraints.
  }

  private async dropConstraints(tableName: string, constraintNames: string[]) {
    for (const constraintName of constraintNames) {
      await this.db.rawQuery(
        `ALTER TABLE IF EXISTS ${tableName} DROP CONSTRAINT IF EXISTS ${constraintName}`
      )
    }
  }
}
