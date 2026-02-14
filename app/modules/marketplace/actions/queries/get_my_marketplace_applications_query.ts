import type {
  CurrentApplicantMarketplaceApplication,
  ListCurrentApplicantApplicationsInput,
  MarketplaceApplicationExecutionContext,
  MarketplaceApplicationPage,
} from '#modules/marketplace/actions/dtos/marketplace_application'
import type { TaskApplicationFlowPort } from '#modules/marketplace/actions/ports/outbound/task_application_flow_port'

/**
 * Marketplace-owned applicant proposal tracker query facade.
 */
export class GetMyMarketplaceApplicationsQuery {
  constructor(
    private readonly flow: TaskApplicationFlowPort,
    private readonly execCtx: MarketplaceApplicationExecutionContext
  ) {}

  public handle(
    input: ListCurrentApplicantApplicationsInput
  ): Promise<MarketplaceApplicationPage<CurrentApplicantMarketplaceApplication>> {
    return this.flow.listForCurrentApplicant(this.execCtx, input)
  }
}
