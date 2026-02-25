import { ApplyMarketplaceTaskCommand } from '#modules/marketplace/actions/commands/apply_marketplace_task_command'
import { ProcessMarketplaceApplicationCommand } from '#modules/marketplace/actions/commands/process_marketplace_application_command'
import { WithdrawMarketplaceApplicationCommand } from '#modules/marketplace/actions/commands/withdraw_marketplace_application_command'
import { MarketplaceActionFactory } from '#modules/marketplace/actions/ports/inbound/marketplace_action_factory'
import type { MarketplaceOrganizationAccessReader } from '#modules/marketplace/actions/ports/outbound/marketplace_organization_access_reader'
import type { MarketplacePublicTaskListingReader } from '#modules/marketplace/actions/ports/outbound/marketplace_public_task_listing_reader'
import type { MarketplaceSkillCatalogReader } from '#modules/marketplace/actions/ports/outbound/marketplace_skill_catalog_reader'
import type { TaskApplicationFlowPort } from '#modules/marketplace/actions/ports/outbound/task_application_flow_port'
import { GetMarketplaceApplicationMatchScoreQuery } from '#modules/marketplace/actions/queries/get_marketplace_application_match_score_query'
import { GetMarketplaceOrganizationApplicationsQuery } from '#modules/marketplace/actions/queries/get_marketplace_organization_applications_query'
import { GetMarketplaceTaskApplicationsQuery } from '#modules/marketplace/actions/queries/get_marketplace_task_applications_query'
import { GetMarketplaceTaskApplicationsRankingQuery } from '#modules/marketplace/actions/queries/get_marketplace_task_applications_ranking_query'
import { GetMarketplaceTasksPageQuery } from '#modules/marketplace/actions/queries/get_marketplace_tasks_page_query'
import { GetMarketplaceTasksQuery } from '#modules/marketplace/actions/queries/get_marketplace_tasks_query'
import { GetMyMarketplaceApplicationsQuery } from '#modules/marketplace/actions/queries/get_my_marketplace_applications_query'

export class ComposedMarketplaceActionFactory extends MarketplaceActionFactory {
  constructor(
    private readonly organizationAccess: MarketplaceOrganizationAccessReader,
    private readonly publicTaskListing: MarketplacePublicTaskListingReader,
    private readonly skillCatalog: MarketplaceSkillCatalogReader,
    private readonly taskApplicationFlow: TaskApplicationFlowPort
  ) {
    super()
  }

  makeGetMarketplaceTasksQuery(
    execCtx: ConstructorParameters<typeof GetMarketplaceTasksQuery>[2]
  ): GetMarketplaceTasksQuery {
    return new GetMarketplaceTasksQuery(this.publicTaskListing, this.organizationAccess, execCtx)
  }

  makeGetMarketplaceTasksPageQuery(
    execCtx: ConstructorParameters<typeof GetMarketplaceTasksQuery>[2]
  ): GetMarketplaceTasksPageQuery {
    return new GetMarketplaceTasksPageQuery(
      this.makeGetMarketplaceTasksQuery(execCtx),
      this.skillCatalog
    )
  }

  makeApplyMarketplaceTaskCommand(
    execCtx: ConstructorParameters<typeof ApplyMarketplaceTaskCommand>[1]
  ): ApplyMarketplaceTaskCommand {
    return new ApplyMarketplaceTaskCommand(this.taskApplicationFlow, execCtx)
  }

  makeGetMarketplaceTaskApplicationsQuery(
    execCtx: ConstructorParameters<typeof GetMarketplaceTaskApplicationsQuery>[1]
  ): GetMarketplaceTaskApplicationsQuery {
    return new GetMarketplaceTaskApplicationsQuery(this.taskApplicationFlow, execCtx)
  }

  makeGetMyMarketplaceApplicationsQuery(
    execCtx: ConstructorParameters<typeof GetMyMarketplaceApplicationsQuery>[1]
  ): GetMyMarketplaceApplicationsQuery {
    return new GetMyMarketplaceApplicationsQuery(this.taskApplicationFlow, execCtx)
  }

  makeGetMarketplaceOrganizationApplicationsQuery(
    execCtx: ConstructorParameters<typeof GetMarketplaceOrganizationApplicationsQuery>[1]
  ): GetMarketplaceOrganizationApplicationsQuery {
    return new GetMarketplaceOrganizationApplicationsQuery(this.taskApplicationFlow, execCtx)
  }

  makeGetMarketplaceApplicationMatchScoreQuery(
    execCtx: ConstructorParameters<typeof GetMarketplaceApplicationMatchScoreQuery>[1]
  ): GetMarketplaceApplicationMatchScoreQuery {
    return new GetMarketplaceApplicationMatchScoreQuery(this.taskApplicationFlow, execCtx)
  }

  makeGetMarketplaceTaskApplicationsRankingQuery(
    execCtx: ConstructorParameters<typeof GetMarketplaceTaskApplicationsRankingQuery>[1]
  ): GetMarketplaceTaskApplicationsRankingQuery {
    return new GetMarketplaceTaskApplicationsRankingQuery(this.taskApplicationFlow, execCtx)
  }

  makeProcessMarketplaceApplicationCommand(
    execCtx: ConstructorParameters<typeof ProcessMarketplaceApplicationCommand>[1]
  ): ProcessMarketplaceApplicationCommand {
    return new ProcessMarketplaceApplicationCommand(this.taskApplicationFlow, execCtx)
  }

  makeWithdrawMarketplaceApplicationCommand(
    execCtx: ConstructorParameters<typeof WithdrawMarketplaceApplicationCommand>[1]
  ): WithdrawMarketplaceApplicationCommand {
    return new WithdrawMarketplaceApplicationCommand(this.taskApplicationFlow, execCtx)
  }
}
