import { searchAdminConfig } from '#config/search'
import { ApplySearchIndexCleanupCommand } from '#modules/search/actions/commands/apply_search_index_cleanup_command'
import { ApplySearchIndexRollbackCommand } from '#modules/search/actions/commands/apply_search_index_rollback_command'
import { InspectSearchIndicesQuery } from '#modules/search/actions/queries/inspect_search_indices_query'
import { PreviewSearchIndexCleanupQuery } from '#modules/search/actions/queries/preview_search_index_cleanup_query'
import { PreviewSearchIndexRollbackQuery } from '#modules/search/actions/queries/preview_search_index_rollback_query'
import { NodeSearchIndexPlanTokenGenerator } from '#modules/search/infra/adapters/node_search_index_plan_token_generator'
import { PostgresSearchIndexCutoverFence } from '#modules/search/infra/adapters/postgres_search_index_cutover_fence'
import { searchIndexAdminClient } from '#modules/search/infra/elasticsearch_search_index_admin_client'
import { ElasticsearchSearchIndexAdministrationRepository } from '#modules/search/infra/search_index_administration_repository'
import { buildSearchIndexDescriptors } from '#modules/search/infra/search_index_names'

const administration = new ElasticsearchSearchIndexAdministrationRepository(
  searchIndexAdminClient,
  new PostgresSearchIndexCutoverFence()
)
const descriptors = buildSearchIndexDescriptors()
const planTokenGenerator = new NodeSearchIndexPlanTokenGenerator()
const now = () => new Date()

export const inspectSearchIndicesQuery = new InspectSearchIndicesQuery(
  administration,
  descriptors
)
export const previewSearchIndexCleanupQuery = new PreviewSearchIndexCleanupQuery(
  administration,
  descriptors,
  planTokenGenerator,
  now
)
export const applySearchIndexCleanupCommand = new ApplySearchIndexCleanupCommand(
  administration,
  descriptors,
  planTokenGenerator,
  now
)
export const previewSearchIndexRollbackQuery = new PreviewSearchIndexRollbackQuery(
  administration,
  descriptors
)
export const applySearchIndexRollbackCommand = new ApplySearchIndexRollbackCommand(
  administration,
  descriptors,
  searchAdminConfig.allowUnverifiedRollbackApply
)
