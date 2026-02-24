import { TaskApplicantMatchReaderAdapter } from './adapters/task_applicant_match_reader_adapter.js'
import { notificationTransactionStager } from './notification_composition.js'
import { taskExternalDeps } from './task_external_dependencies_composition.js'

import { TasksTaskApplicationCapabilityAdapter } from '#composition/adapters/tasks_task_application_capability_adapter'
import {
  makeApplyForTaskCommand,
  makeGetMyApplicationsQuery,
  makeGetOrganizationTaskApplicationsQuery,
  makeGetTaskApplicationsQuery,
  makeProcessApplicationCommand,
  makeWithdrawApplicationCommand,
} from '#composition/task_action_factory'
import GetApplicationMatchScoreQuery from '#modules/tasks/actions/queries/get_application_match_score_query'
import GetTaskApplicationsRankingQuery from '#modules/tasks/actions/queries/get_task_applications_ranking_query'
import type { TaskApplicationCapability } from '#modules/tasks/public_contracts/task_application_capability'

const taskApplicantMatches = new TaskApplicantMatchReaderAdapter()

export const taskApplicationCapability: TaskApplicationCapability =
  new TasksTaskApplicationCapabilityAdapter({
  makeApply: (context) => makeApplyForTaskCommand(context, notificationTransactionStager),
  makeProcess: (context) => makeProcessApplicationCommand(context, notificationTransactionStager),
  makeWithdraw: makeWithdrawApplicationCommand,
  makeListForTask: makeGetTaskApplicationsQuery,
  makeListForCurrentApplicant: makeGetMyApplicationsQuery,
  makeListForOrganization: makeGetOrganizationTaskApplicationsQuery,
  makeScore: (context) =>
    new GetApplicationMatchScoreQuery(
      context,
      taskExternalDeps.permission,
      taskApplicantMatches
    ),
  makeRank: (context) =>
    new GetTaskApplicationsRankingQuery(
      context,
      taskExternalDeps.user,
      taskExternalDeps.permission,
      taskApplicantMatches
    ),
  })
