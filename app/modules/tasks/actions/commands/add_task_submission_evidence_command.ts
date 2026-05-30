import db from '@adonisjs/lucid/services/db'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import {
  assertHttpUrl,
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/commands/task_completion_package_access'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export interface AddTaskSubmissionEvidenceDTO {
  submission_id: string
  evidence_type:
    | 'pull_request'
    | 'commit_link'
    | 'demo_recording'
    | 'test_report'
    | 'document_link'
    | 'screenshot'
    | 'metrics_screenshot'
    | 'deployment_link'
    | 'other'
  url: string
  title?: string | null
  description?: string | null
}

export interface TaskSubmissionEvidenceResult extends AddTaskSubmissionEvidenceDTO {
  id: string
  uploaded_by: string
}

export default class AddTaskSubmissionEvidenceCommand {
  constructor(private execCtx: TaskActionContext) {}

  async execute(dto: AddTaskSubmissionEvidenceDTO): Promise<TaskSubmissionEvidenceResult> {
    const submission = (await db
      .from('task_submissions')
      .where('id', dto.submission_id)
      .first()) as
      | {
          status: string
          task_id: string
          submitted_by: string
        }
      | undefined
    if (!submission) {
      throw new NotFoundException('Task submission not found')
    }

    if (submission.status === 'locked') {
      throw new BusinessLogicException('Task submission is locked')
    }

    assertHttpUrl(dto.url)

    const task = await loadTaskForCompletionPackage(submission.task_id)
    const actorId = await assertTaskCompletionPackageAccess(this.execCtx, task, [
      submission.submitted_by,
    ])

    const [created] = (await db
      .table('task_submission_evidences')
      .insert({
        submission_id: dto.submission_id,
        evidence_type: dto.evidence_type,
        url: dto.url,
        title: dto.title ?? null,
        description: dto.description ?? null,
        uploaded_by: actorId,
      })
      .returning('*')) as Record<string, unknown>[]

    return created as unknown as TaskSubmissionEvidenceResult
  }
}
