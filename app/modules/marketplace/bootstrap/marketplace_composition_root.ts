import { ApplyMarketplaceTaskCommand } from '../actions/commands/apply_marketplace_task_command.js'
import { ProcessMarketplaceApplicationCommand } from '../actions/commands/process_marketplace_application_command.js'
import { WithdrawMarketplaceApplicationCommand } from '../actions/commands/withdraw_marketplace_application_command.js'
import { GetMarketplaceApplicationMatchScoreQuery } from '../actions/queries/get_marketplace_application_match_score_query.js'
import { GetMarketplaceTaskApplicationsQuery } from '../actions/queries/get_marketplace_task_applications_query.js'
import { GetMarketplaceTaskApplicationsRankingQuery } from '../actions/queries/get_marketplace_task_applications_ranking_query.js'
import { GetMarketplaceTasksQuery } from '../actions/queries/get_marketplace_tasks_query.js'
import { GetMyMarketplaceApplicationsQuery } from '../actions/queries/get_my_marketplace_applications_query.js'
import { ProjectsPublicApiProjectAccess } from '../infra/adapters/projects_public_api_project_access.js'

const projectAccessAdapter = new ProjectsPublicApiProjectAccess()

export const marketplaceCompositionRoot = {
  makeGetMarketplaceTasksQuery: (execCtx: ConstructorParameters<typeof GetMarketplaceTasksQuery>[0]) => {
    return new GetMarketplaceTasksQuery(execCtx)
  },

  makeApplyMarketplaceTaskCommand: (execCtx: ConstructorParameters<typeof ApplyMarketplaceTaskCommand>[0]) => {
    return new ApplyMarketplaceTaskCommand(execCtx)
  },

  makeGetMarketplaceTaskApplicationsQuery: (
    execCtx: ConstructorParameters<typeof GetMarketplaceTaskApplicationsQuery>[0]
  ) => {
    return new GetMarketplaceTaskApplicationsQuery(execCtx)
  },

  makeGetMyMarketplaceApplicationsQuery: (
    execCtx: ConstructorParameters<typeof GetMyMarketplaceApplicationsQuery>[0]
  ) => {
    return new GetMyMarketplaceApplicationsQuery(execCtx)
  },

  makeGetMarketplaceApplicationMatchScoreQuery: (
    execCtx: ConstructorParameters<typeof GetMarketplaceApplicationMatchScoreQuery>[0]
  ) => {
    return new GetMarketplaceApplicationMatchScoreQuery(execCtx)
  },

  makeGetMarketplaceTaskApplicationsRankingQuery: (
    execCtx: ConstructorParameters<typeof GetMarketplaceTaskApplicationsRankingQuery>[0]
  ) => {
    return new GetMarketplaceTaskApplicationsRankingQuery(execCtx)
  },

  makeProcessMarketplaceApplicationCommand: (
    execCtx: ConstructorParameters<typeof ProcessMarketplaceApplicationCommand>[0]
  ) => {
    return new ProcessMarketplaceApplicationCommand(execCtx)
  },

  makeWithdrawMarketplaceApplicationCommand: (
    execCtx: ConstructorParameters<typeof WithdrawMarketplaceApplicationCommand>[0]
  ) => {
    return new WithdrawMarketplaceApplicationCommand(execCtx)
  },

  projectAccessAdapter
}
