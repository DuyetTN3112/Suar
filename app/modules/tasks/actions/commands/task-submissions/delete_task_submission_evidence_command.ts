import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/task_completion_package_access'
import { canMutateTaskSubmissionEvidence } from '#modules/tasks/domain/task-submissions/task_submission_rules'

export interface DeleteTaskSubmissionEvidenceDTO {
  evidence_id: string
}

export default class DeleteTaskSubmissionEvidenceCommand extends BaseCommand<DeleteTaskSubmissionEvidenceDTO, void> {
  constructor(
    protected override execCtx: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies
  ) {
    super(execCtx, dependencies.transactions)
  }

  override async handle(dto: DeleteTaskSubmissionEvidenceDTO): Promise<void> {
    return this.execute(dto)
  }

  async execute(dto: DeleteTaskSubmissionEvidenceDTO): Promise<void> {
    const evidence = await this.dependencies.completion.findSubmissionEvidence(dto.evidence_id)
    if (!evidence) {
      throw new NotFoundException('Task submission evidence not found')
    }

    const submission = await this.dependencies.completion.findSubmissionById(evidence.submission_id)
    if (!submission) {
      throw new NotFoundException('Task submission not found')
    }

    const policyResult = canMutateTaskSubmissionEvidence(submission.status)
    if (!policyResult.allowed) {
      throw new BusinessLogicException(policyResult.reason)
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
