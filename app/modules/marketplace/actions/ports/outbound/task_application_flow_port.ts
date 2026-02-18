import type {
  CurrentApplicantMarketplaceApplication,
  DecideMarketplaceApplicationInput,
  ListCurrentApplicantApplicationsInput,
  ListMarketplaceTaskApplicationsInput,
  ListOrganizationMarketplaceApplicationsInput,
  MarketplaceApplicationExecutionContext,
  MarketplaceApplicationForReview,
  MarketplaceApplicationPage,
  MarketplaceApplicationScore,
  RankedMarketplaceApplication,
  RankMarketplaceTaskApplicationsInput,
  ScoreMarketplaceApplicationInput,
  SubmittedMarketplaceApplication,
  SubmitMarketplaceApplicationInput,
  WithdrawMarketplaceApplicationInput,
} from '#modules/marketplace/actions/dtos/marketplace_application'

export interface TaskApplicationFlowPort {
  submit(
    context: MarketplaceApplicationExecutionContext,
    input: SubmitMarketplaceApplicationInput
  ): Promise<SubmittedMarketplaceApplication>
  decide(
    context: MarketplaceApplicationExecutionContext,
    input: DecideMarketplaceApplicationInput
  ): Promise<void>
  withdraw(
    context: MarketplaceApplicationExecutionContext,
    input: WithdrawMarketplaceApplicationInput
  ): Promise<void>
  listForTask(
    context: MarketplaceApplicationExecutionContext,
    input: ListMarketplaceTaskApplicationsInput
  ): Promise<MarketplaceApplicationPage<MarketplaceApplicationForReview>>
  listForCurrentApplicant(
    context: MarketplaceApplicationExecutionContext,
    input: ListCurrentApplicantApplicationsInput
  ): Promise<MarketplaceApplicationPage<CurrentApplicantMarketplaceApplication>>
  listForOrganization(
    context: MarketplaceApplicationExecutionContext,
    input: ListOrganizationMarketplaceApplicationsInput
  ): Promise<MarketplaceApplicationPage<MarketplaceApplicationForReview>>
  score(
    context: MarketplaceApplicationExecutionContext,
    input: ScoreMarketplaceApplicationInput
  ): Promise<MarketplaceApplicationScore>
  rank(
    context: MarketplaceApplicationExecutionContext,
    input: RankMarketplaceTaskApplicationsInput
  ): Promise<RankedMarketplaceApplication[]>
}
