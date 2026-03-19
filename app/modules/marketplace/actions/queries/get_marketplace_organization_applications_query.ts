import type {
  ListOrganizationMarketplaceApplicationsInput,
  MarketplaceApplicationExecutionContext,
  MarketplaceApplicationForReview,
  MarketplaceApplicationPage,
} from '#modules/marketplace/actions/dtos/marketplace_application'
import type { TaskApplicationFlowPort } from '#modules/marketplace/actions/ports/outbound/task_application_flow_port'

export class GetMarketplaceOrganizationApplicationsQuery {
  constructor(
    private readonly flow: TaskApplicationFlowPort,
    private readonly execCtx: MarketplaceApplicationExecutionContext
  ) {}

  public handle(
    input: ListOrganizationMarketplaceApplicationsInput
  ): Promise<MarketplaceApplicationPage<MarketplaceApplicationForReview>> {
    return this.flow.listForOrganization(this.execCtx, input)
  }
}
