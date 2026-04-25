import { TaskApplicantMatchReaderAdapter } from '#composition/adapters/tasks/task_applicant_match_reader_adapter'
import { notificationTransactionStager } from '#composition/notifications/notification-feed/notification_composition'
import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'

import { TasksTaskApplicationCapabilityAdapter } from '#composition/adapters/tasks/tasks_task_application_capability_adapter'
import {
  makeApplyForTaskCommand,
  makeGetMyApplicationsQuery,
  makeGetOrganizationTaskApplicationsQuery,
  makeGetTaskApplicationsQuery,
  makeProcessApplicationCommand,
  makeWithdrawApplicationCommand,
} from '#composition/tasks/task-factories/task_action_factory'
import GetApplicationMatchScoreQuery from '#modules/tasks/actions/queries/task-applications/get_application_match_score_query'
import GetTaskApplicationsRankingQuery from '#modules/tasks/actions/queries/task-applications/get_task_applications_ranking_query'
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
