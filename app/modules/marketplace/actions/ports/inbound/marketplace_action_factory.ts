import type { ApplyMarketplaceTaskCommand } from '../../commands/marketplace-application/apply_marketplace_task_command.js'
import type { ProcessMarketplaceApplicationCommand } from '../../commands/marketplace-application/process_marketplace_application_command.js'
import type { WithdrawMarketplaceApplicationCommand } from '../../commands/marketplace-application/withdraw_marketplace_application_command.js'
import type { GetMarketplaceApplicationMatchScoreQuery } from '../../queries/marketplace-application/get_marketplace_application_match_score_query.js'
import type { GetMarketplaceOrganizationApplicationsQuery } from '../../queries/marketplace-application/get_marketplace_organization_applications_query.js'
import type { GetMarketplaceTaskApplicationsQuery } from '../../queries/marketplace-application/get_marketplace_task_applications_query.js'
import type { GetMarketplaceTaskApplicationsRankingQuery } from '../../queries/marketplace-application/get_marketplace_task_applications_ranking_query.js'
import type { GetMarketplaceTasksPageQuery } from '../../queries/marketplace-application/get_marketplace_tasks_page_query.js'
import type { GetMarketplaceTasksQuery } from '../../queries/marketplace-application/get_marketplace_tasks_query.js'
import type { GetMyMarketplaceApplicationsQuery } from '../../queries/marketplace-application/get_my_marketplace_applications_query.js'

/**
 * Runtime DI token for context-bound Marketplace use cases.
 *
 * Its implementation belongs to the composition root. Endpoint handlers use
 * it only to obtain the single Command or Query that owns their intent.
 */
export abstract class MarketplaceActionFactory {
  abstract makeGetMarketplaceTasksQuery(
    execCtx: ConstructorParameters<typeof GetMarketplaceTasksQuery>[2]
  ): Pick<GetMarketplaceTasksQuery, 'handle' | 'executeAndWrap'>

  abstract makeGetMarketplaceTasksPageQuery(
    execCtx: ConstructorParameters<typeof GetMarketplaceTasksQuery>[2]
  ): Pick<GetMarketplaceTasksPageQuery, 'handle' | 'executeAndWrap'>

  abstract makeApplyMarketplaceTaskCommand(
    execCtx: ConstructorParameters<typeof ApplyMarketplaceTaskCommand>[1]
  ): ApplyMarketplaceTaskCommand

  abstract makeGetMarketplaceTaskApplicationsQuery(
    execCtx: ConstructorParameters<typeof GetMarketplaceTaskApplicationsQuery>[1]
  ): GetMarketplaceTaskApplicationsQuery

  abstract makeGetMyMarketplaceApplicationsQuery(
    execCtx: ConstructorParameters<typeof GetMyMarketplaceApplicationsQuery>[1]
  ): GetMyMarketplaceApplicationsQuery

  abstract makeGetMarketplaceOrganizationApplicationsQuery(
    execCtx: ConstructorParameters<typeof GetMarketplaceOrganizationApplicationsQuery>[1]
  ): GetMarketplaceOrganizationApplicationsQuery

  abstract makeGetMarketplaceApplicationMatchScoreQuery(
    execCtx: ConstructorParameters<typeof GetMarketplaceApplicationMatchScoreQuery>[1]
  ): GetMarketplaceApplicationMatchScoreQuery

  abstract makeGetMarketplaceTaskApplicationsRankingQuery(
    execCtx: ConstructorParameters<typeof GetMarketplaceTaskApplicationsRankingQuery>[1]
  ): GetMarketplaceTaskApplicationsRankingQuery

  abstract makeProcessMarketplaceApplicationCommand(
    execCtx: ConstructorParameters<typeof ProcessMarketplaceApplicationCommand>[1]
  ): ProcessMarketplaceApplicationCommand

  abstract makeWithdrawMarketplaceApplicationCommand(
    execCtx: ConstructorParameters<typeof WithdrawMarketplaceApplicationCommand>[1]
  ): WithdrawMarketplaceApplicationCommand
}
