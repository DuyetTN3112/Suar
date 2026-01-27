import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/services/task_completion_access_resolver'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export interface DeleteTaskSubmissionEvidenceDTO {
  evidence_id: string
}

export default class DeleteTaskSubmissionEvidenceCommand {
  constructor(
    private execCtx: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies
  ) {}

  async execute(dto: DeleteTaskSubmissionEvidenceDTO): Promise<void> {
    const evidence = await this.dependencies.completion.findSubmissionEvidence(dto.evidence_id)
    if (!evidence) {
      throw new NotFoundException('Task submission evidence not found')
    }

    const submission = await this.dependencies.completion.findSubmissionById(evidence.submission_id)
    if (!submission) {
      throw new NotFoundException('Task submission not found')
    }

    if (submission.status === 'locked') {
      throw new BusinessLogicException('Task submission is locked')
    }

    const task = await loadTaskForCompletionPackage(
      submission.task_id,
      this.dependencies.completion
    )
    await assertTaskCompletionPackageAccess(
      this.execCtx,
      task,
      [submission.submitted_by, evidence.uploaded_by],
      this.dependencies.org
    )

    await this.dependencies.completion.deleteSubmissionEvidence(dto.evidence_id)
  }
}
