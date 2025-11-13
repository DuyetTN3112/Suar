import {
  ApplyForTaskDTO,
  GetTaskApplicationsDTO,
  ProcessApplicationDTO,
  WithdrawApplicationDTO,
} from '#modules/tasks/actions/dtos/request/task_application_dtos'
import GetApplicationMatchScoreQuery from '#modules/tasks/actions/queries/get_application_match_score_query'
import GetMyApplicationsQuery from '#modules/tasks/actions/queries/get_my_applications_query'
import type { GetMyApplicationsInput as InternalGetMyApplicationsInput } from '#modules/tasks/actions/queries/get_my_applications_query'
import GetTaskApplicationsQuery from '#modules/tasks/actions/queries/get_task_applications_query'
import GetTaskApplicationsRankingQuery from '#modules/tasks/actions/queries/get_task_applications_ranking_query'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import {
  makeApplyForTaskCommand,
  makeProcessApplicationCommand,
  makeWithdrawApplicationCommand,
} from '#modules/tasks/bootstrap/task_action_factory'
import {
  applyForTaskRequestValidator,
  processApplicationRequestValidator,
} from '#modules/tasks/validators/task'

export {
  ApplyForTaskDTO,
  GetTaskApplicationsDTO,
  ProcessApplicationDTO,
  WithdrawApplicationDTO,
}

export type GetMyApplicationsInput = InternalGetMyApplicationsInput
export type TaskApplicationFlowContext = TaskActionContext
export type ApplyForTaskResult = Awaited<ReturnType<ReturnType<typeof makeApplyForTaskCommand>['handle']>>
export type TaskApplicationsResult = Awaited<ReturnType<GetTaskApplicationsQuery['handle']>>
export type MyApplicationsResult = Awaited<ReturnType<GetMyApplicationsQuery['handle']>>
export type ApplicationMatchScoreInput = Parameters<GetApplicationMatchScoreQuery['handle']>[0]
export type ApplicationMatchScoreResult = Awaited<
  ReturnType<GetApplicationMatchScoreQuery['handle']>
>
export type TaskApplicationsRankingInput = Parameters<GetTaskApplicationsRankingQuery['handle']>[0]
export type TaskApplicationsRankingResult = Awaited<
  ReturnType<GetTaskApplicationsRankingQuery['handle']>
>

export { applyForTaskRequestValidator, processApplicationRequestValidator }

export function applyForTaskViaTaskApplications(
  execCtx: TaskActionContext,
  dto: ApplyForTaskDTO
) {
  return makeApplyForTaskCommand(execCtx).handle(dto)
}

export async function processTaskApplicationViaTaskApplications(
  execCtx: TaskActionContext,
  dto: ProcessApplicationDTO
): Promise<void> {
  await makeProcessApplicationCommand(execCtx).handle(dto)
}

export async function withdrawTaskApplicationViaTaskApplications(
  execCtx: TaskActionContext,
  dto: WithdrawApplicationDTO
): Promise<void> {
  await makeWithdrawApplicationCommand(execCtx).handle(dto)
}

export function listTaskApplicationsViaTaskApplications(
  execCtx: TaskActionContext,
  dto: GetTaskApplicationsDTO
): Promise<TaskApplicationsResult> {
  return new GetTaskApplicationsQuery(execCtx).handle(dto)
}

export function listMyApplicationsViaTaskApplications(
  execCtx: TaskActionContext,
  input: GetMyApplicationsInput
): Promise<MyApplicationsResult> {
  return new GetMyApplicationsQuery(execCtx).handle(input)
}

export function getApplicationMatchScoreViaTaskApplications(
  execCtx: TaskActionContext,
  input: ApplicationMatchScoreInput
): Promise<ApplicationMatchScoreResult> {
  return new GetApplicationMatchScoreQuery(execCtx).handle(input)
}

export function rankTaskApplicationsViaTaskApplications(
  execCtx: TaskActionContext,
  input: TaskApplicationsRankingInput
): Promise<TaskApplicationsRankingResult> {
  return new GetTaskApplicationsRankingQuery(execCtx).handle(input)
}
