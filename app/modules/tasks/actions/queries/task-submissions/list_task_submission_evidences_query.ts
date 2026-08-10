import type AppException from '#modules/errors/public_contracts/application_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { Result } from '#modules/errors/public_contracts/result'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/task_completion_package_access'

export interface ListTaskSubmissionEvidencesInput {
  submissionId: string
}

type ListTaskSubmissionEvidencesOutput = Awaited<
  ReturnType<TaskExternalDependencies['completion']['listSubmissionEvidences']>
>

export default class ListTaskSubmissionEvidencesQuery extends BaseQuery<
  ListTaskSubmissionEvidencesInput,
  ListTaskSubmissionEvidencesOutput
> {
  constructor(
    private readonly context: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies
  ) {
    super(context)
  }

  override executeAndWrap(
    input: ListTaskSubmissionEvidencesInput
  ): Promise<Result<ListTaskSubmissionEvidencesOutput, AppException>>
  override executeAndWrap(
    submissionId: string
  ): Promise<Result<ListTaskSubmissionEvidencesOutput, AppException>>
  override executeAndWrap(
    inputOrSubmissionId: ListTaskSubmissionEvidencesInput | string
  ): Promise<Result<ListTaskSubmissionEvidencesOutput, AppException>> {
    const normalizedInput =
      typeof inputOrSubmissionId === 'string'
        ? { submissionId: inputOrSubmissionId }
        : inputOrSubmissionId
    return super.executeAndWrap(normalizedInput)
  }

  async execute(submissionId: string): Promise<ListTaskSubmissionEvidencesOutput> {
    return this.handle({ submissionId })
  }

  async handle(input: ListTaskSubmissionEvidencesInput) {
    const submission = await this.dependencies.completion.findSubmissionById(input.submissionId)
    if (!submission) throw new NotFoundException('Task submission not found')
    const task = await loadTaskForCompletionPackage(
      submission.task_id,
      this.dependencies.completion
    )
    await assertTaskCompletionPackageAccess(
      this.context,
      task,
      [submission.submitted_by],
      this.dependencies.org
    )
    return this.dependencies.completion.listSubmissionEvidences(input.submissionId)
  }
}
