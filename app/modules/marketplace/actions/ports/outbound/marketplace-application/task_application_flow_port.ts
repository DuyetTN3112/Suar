import type AppException from '#modules/errors/public_contracts/application_exception'
import type { Result } from '#modules/errors/public_contracts/result'
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
} from '#modules/marketplace/actions/dtos/marketplace-application/marketplace_application'

export interface TaskApplicationFlowPort {
  submit(
    context: MarketplaceApplicationExecutionContext,
    input: SubmitMarketplaceApplicationInput
  ): Promise<Result<SubmittedMarketplaceApplication, AppException>>
  decide(
    context: MarketplaceApplicationExecutionContext,
    input: DecideMarketplaceApplicationInput
  ): Promise<Result<void, AppException>>
  withdraw(
    context: MarketplaceApplicationExecutionContext,
    input: WithdrawMarketplaceApplicationInput
  ): Promise<Result<void, AppException>>
  listForTask(
    context: MarketplaceApplicationExecutionContext,
    input: ListMarketplaceTaskApplicationsInput
  ): Promise<Result<MarketplaceApplicationPage<MarketplaceApplicationForReview>, AppException>>
  listForCurrentApplicant(
    context: MarketplaceApplicationExecutionContext,
    input: ListCurrentApplicantApplicationsInput
  ): Promise<Result<MarketplaceApplicationPage<CurrentApplicantMarketplaceApplication>, AppException>>
  listForOrganization(
    context: MarketplaceApplicationExecutionContext,
    input: ListOrganizationMarketplaceApplicationsInput
  ): Promise<Result<MarketplaceApplicationPage<MarketplaceApplicationForReview>, AppException>>
  score(
    context: MarketplaceApplicationExecutionContext,
    input: ScoreMarketplaceApplicationInput
  ): Promise<Result<MarketplaceApplicationScore, AppException>>
  rank(
    context: MarketplaceApplicationExecutionContext,
    input: RankMarketplaceTaskApplicationsInput
  ): Promise<Result<RankedMarketplaceApplication[], AppException>>
}
