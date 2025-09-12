import db from '@adonisjs/lucid/services/db'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/commands/task_completion_package_access'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export interface DeleteTaskSubmissionEvidenceDTO {
  evidence_id: string
}

export default class DeleteTaskSubmissionEvidenceCommand {
  constructor(private execCtx: TaskActionContext) {}

  async execute(dto: DeleteTaskSubmissionEvidenceDTO): Promise<void> {
    const evidence = (await db
      .from('task_submission_evidences')
      .where('id', dto.evidence_id)
      .first()) as { submission_id: string; uploaded_by: string } | undefined
    if (!evidence) {
      throw new NotFoundException('Task submission evidence not found')
    }

    const submission = (await db
      .from('task_submissions')
      .where('id', evidence.submission_id)
      .first()) as { status: string; task_id: string; submitted_by: string } | undefined
    if (!submission) {
      throw new NotFoundException('Task submission not found')
    }

    if (submission.status === 'locked') {
      throw new BusinessLogicException('Task submission is locked')
    }

    const task = await loadTaskForCompletionPackage(submission.task_id)
    await assertTaskCompletionPackageAccess(this.execCtx, task, [
      submission.submitted_by,
      evidence.uploaded_by,
    ])

    await db.from('task_submission_evidences').where('id', dto.evidence_id).delete()
  }
}
