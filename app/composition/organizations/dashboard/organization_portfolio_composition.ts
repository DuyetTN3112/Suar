import { OrganizationPortfolioStatsAdapter } from './adapters/organization_portfolio_stats_adapter.js'
import { OrganizationReverseReviewReaderAdapter } from '../../adapters/organizations/organization_reverse_review_reader_adapter.js'
import { ComposedOrganizationPortfolioQueryFactory } from '../directory/factories/organization_directory_action_factories.js'
import {
  organizationMembershipRepository,
  organizationReader,
} from '../persistence/organization_persistence_composition.js'
import { organizationSearchCandidateReader } from '../search/organization_search_composition.js'
import { organizationUserReaderWriter } from '../directory/organization_user_composition.js'

import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationSearchCandidateReader } from '#modules/organizations/actions/ports/outbound/directory/organization_search_candidate_reader'

export const organizationPortfolioStatsReader = new OrganizationPortfolioStatsAdapter()
export const organizationReverseReviewReader = new OrganizationReverseReviewReaderAdapter()
export const organizationPortfolioQueryFactory = new ComposedOrganizationPortfolioQueryFactory(
  organizationPortfolioStatsReader,
  organizationUserReaderWriter,
  organizationReader,
  organizationMembershipRepository,
  organizationSearchCandidateReader,
  organizationReverseReviewReader
)

export const makeGetOrganizationDetailQuery = (context: OrganizationActionContext) =>
  organizationPortfolioQueryFactory.makeDetail(context)

export const makeGetOrganizationShowPageQuery = (context: OrganizationActionContext) =>
  organizationPortfolioQueryFactory.makeShowPage(context)

export const makeGetOrganizationsIndexPageQuery = (
  context: OrganizationActionContext,
  searchCandidates: OrganizationSearchCandidateReader
) => organizationPortfolioQueryFactory.makeIndexPage(context, searchCandidates)
