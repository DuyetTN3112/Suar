import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/task_completion_package_access'
import {
  canMutateTaskSubmissionEvidence,
  isTaskSubmissionEvidenceType,
  type TaskSubmissionEvidenceType,
} from '#modules/tasks/domain/task-submissions/task_submission_rules'

export interface AddTaskSubmissionEvidenceDTO {
  submission_id: string
  evidence_type: TaskSubmissionEvidenceType
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

export default class AddTaskSubmissionEvidenceCommand extends BaseCommand<
  AddTaskSubmissionEvidenceDTO,
  TaskSubmissionEvidenceResult
> {
  constructor(
    protected override execCtx: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies
  ) {
    super(execCtx, dependencies.transactions)
  }

  override async handle(dto: AddTaskSubmissionEvidenceDTO): Promise<TaskSubmissionEvidenceResult> {
    return this.execute(dto)
  }

  async execute(dto: AddTaskSubmissionEvidenceDTO): Promise<TaskSubmissionEvidenceResult> {
    if (!isTaskSubmissionEvidenceType(dto.evidence_type)) {
      throw ValidationException.field('evidence_type', 'Unsupported task submission evidence type')
    }

    const submission = await this.dependencies.completion.findSubmissionById(dto.submission_id)
    if (!submission) {
      throw new NotFoundException('Task submission not found')
    }

    const policyResult = canMutateTaskSubmissionEvidence(submission.status)
    if (!policyResult.allowed) {
      throw new BusinessLogicException(policyResult.reason)
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
