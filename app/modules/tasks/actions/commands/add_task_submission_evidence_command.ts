import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/services/task_completion_access_resolver'
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

function assertHttpUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new BusinessLogicException('Invalid URL')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new BusinessLogicException('Invalid URL')
  }
}

export default class AddTaskSubmissionEvidenceCommand {
  constructor(
    private execCtx: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies
  ) {}

  async execute(dto: AddTaskSubmissionEvidenceDTO): Promise<TaskSubmissionEvidenceResult> {
    const submission = await this.dependencies.completion.findSubmissionById(dto.submission_id)
    if (!submission) {
      throw new NotFoundException('Task submission not found')
    }

    if (submission.status === 'locked') {
      throw new BusinessLogicException('Task submission is locked')
    }

    assertHttpUrl(dto.url)

    const task = await loadTaskForCompletionPackage(
      submission.task_id,
      this.dependencies.completion
    )
    const actorId = await assertTaskCompletionPackageAccess(
      this.execCtx,
      task,
      [submission.submitted_by],
      this.dependencies.org
    )

    const created = await this.dependencies.completion.createSubmissionEvidence({
      submission_id: dto.submission_id,
      evidence_type: dto.evidence_type,
      url: dto.url,
      title: dto.title ?? null,
      description: dto.description ?? null,
      uploaded_by: actorId,
    })

    return created as unknown as TaskSubmissionEvidenceResult
  }
}
