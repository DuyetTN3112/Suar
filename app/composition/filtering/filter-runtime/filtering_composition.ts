import { randomUUID } from 'node:crypto'

import { taskDiscoveryFilter } from '#composition/search/public-api/search_public_api_composition'
import {
  adminAuditFilterDefinition,
  AdminAuditFilterContextProvider,
} from '#modules/admin/audit_logs/filtering/audit_logs/admin_audit_filter_context_provider'
import { AdminAuditPermissionProvider } from '#modules/admin/audit_logs/filtering/audit_logs/admin_audit_permission_provider'
import { LucidAdminAuditAuthorizationReader } from '#modules/admin/audit_logs/filtering/audit_logs/lucid_admin_audit_authorization_reader'
import { PostgresAuditLogFilterExecutor } from '#modules/audit/infra/adapters/filtering/postgres_audit_log_filter_executor'
import { FilterAuditLogsQuery } from '#modules/audit/infra/repositories/read/filter_audit_logs_query'
import { CreateFilterAlertCommand } from '#modules/filtering/actions/commands/filter-alert/create_filter_alert_command'
import { CreateFilterAlertWorkflow } from '#modules/filtering/actions/commands/filter-alert/create_filter_alert_workflow'
import { UpdateFilterAlertCommand } from '#modules/filtering/actions/commands/filter-alert/update_filter_alert_command'
import { CoordinateTaxonomyFilterConsumersCommand } from '#modules/filtering/actions/commands/filtering-observability/coordinate_taxonomy_filter_consumers_command'
import { CreateSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/create_saved_filter_view_command'
import { DeleteSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/delete_saved_filter_view_command'
import { DuplicateSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/duplicate_saved_filter_view_command'
import { ShareSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/share_saved_filter_view_command'
import { UpdateSavedFilterViewCommand } from '#modules/filtering/actions/commands/saved-filter-views/update_saved_filter_view_command'
import { FilteringActionFactory } from '#modules/filtering/actions/ports/inbound/filtering_action_factory'
import { GetFilterAlertQuery } from '#modules/filtering/actions/queries/filter-alert/get_filter_alert_query'
import { ExecuteFilterQuery } from '#modules/filtering/actions/queries/filtering-runtime/execute_filter_query'
import { ExecuteSavedFilterViewQuery } from '#modules/filtering/actions/queries/saved-filter-views/execute_saved_filter_view_query'
import { GetSavedFilterViewQuery } from '#modules/filtering/actions/queries/saved-filter-views/get_saved_filter_view_query'
import { ListSavedFilterViewsQuery } from '#modules/filtering/actions/queries/saved-filter-views/list_saved_filter_views_query'
import { PostgresFilterAlertEvaluator } from '#modules/filtering/infra/adapters/filter-alert/postgres_filter_alert_evaluator'
import { PostgresFilterAlertNotificationDelivery } from '#modules/filtering/infra/adapters/filter-alert/postgres_filter_alert_notification_delivery'
import { PostgresFilterAlertPauseAdapter } from '#modules/filtering/infra/adapters/filter-alert/postgres_filter_alert_pause_adapter'
import { PostgresFilterAlertPrincipalResolver } from '#modules/filtering/infra/adapters/filter-alert/postgres_filter_alert_principal_resolver'
import { InMemoryFilterContextRegistry } from '#modules/filtering/infra/adapters/filtering-runtime/in_memory_filter_context_registry'
import { LucidFilterTransactionRunner } from '#modules/filtering/infra/adapters/filtering-runtime/lucid_filter_transaction_runner'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import { PostgresFilterSavedViewAuthorization } from '#modules/filtering/infra/adapters/saved-filter-views/postgres_filter_saved_view_authorization'
import { PostgresFilterTaxonomyMigrationRunRepository } from '#modules/filtering/infra/repositories/filter_taxonomy_migration_run_repository'
import { PostgresFilterAlertRepository } from '#modules/filtering/infra/repositories/saved-filter-views/postgres_filter_alert_repository'
import { PostgresFilterSavedViewMigrationRunRepository } from '#modules/filtering/infra/repositories/saved-filter-views/postgres_filter_saved_view_migration_run_repository'
import { PostgresFilterSavedViewRepository } from '#modules/filtering/infra/repositories/saved-filter-views/postgres_filter_saved_view_repository'
import { PostgresFilterSavedViewTaxonomyReferenceRepository } from '#modules/filtering/infra/repositories/saved-filter-views/postgres_filter_saved_view_taxonomy_reference_repository'
import { TaxonomyReferenceProjectingFilterSavedViewRepository } from '#modules/filtering/infra/repositories/saved-filter-views/taxonomy_reference_projecting_filter_saved_view_repository'
import { filterObservabilityLoggerSink } from '#modules/filtering/observability/filtering-observability/filter_observability_logger_sink'
import type { FilterContextProvider } from '#modules/filtering/public_contracts/filter_context_provider'
import { SearchBlendedFilterContextProvider } from '#modules/search/public_contracts/search_blended_filter_context'
import { SEARCH_BLENDED_CONTEXT } from '#modules/search/public_contracts/search_discovery_contract'
import {
  TASK_DISCOVERY_CONTEXTS,
  TaskDiscoveryFilterContextProvider,
} from '#modules/tasks/public_contracts/task-discovery/task_discovery_filter_context'
import { LucidTaxonomyVersionReader } from '#modules/taxonomy/infra/adapters/taxonomy-governance/lucid_taxonomy_version_reader'

const auditAuthorizationReader = new LucidAdminAuditAuthorizationReader()
const filterHashGenerator = new NodeFilterHashGenerator()

/**
 * One registry serves both context discovery and executor resolution. Contexts
 * are contributed here at the composition root so the Filtering module never
 * imports a product domain (Filter Platform §7).
 */
const registry = new InMemoryFilterContextRegistry()

registry.registerExecutor(new PostgresAuditLogFilterExecutor({ query: new FilterAuditLogsQuery() }))
// Registered so startup validation proves the context's declared capabilities
// are a subset of its executor's before any request is served.
registry.registerContext(adminAuditFilterDefinition())

const adminAuditContextProvider = new AdminAuditFilterContextProvider(auditAuthorizationReader)
const taskDiscoveryContextProvider = new TaskDiscoveryFilterContextProvider()
const searchBlendedContextProvider = new SearchBlendedFilterContextProvider()

let initialized = false

export function filterContextRegistry(): InMemoryFilterContextRegistry {
  if (!initialized) {
    registry.initialize()
    initialized = true
  }
  return registry
}

/**
 * Context discovery is delegated to the owning domain provider, which performs
 * its own per-principal authorization before a definition is revealed.
 */
export const filterContextProvider: FilterContextProvider = {
  getEffectiveDefinition: (input) =>
    input.context === TASK_DISCOVERY_CONTEXTS.public ||
    input.context === TASK_DISCOVERY_CONTEXTS.member
      ? taskDiscoveryContextProvider.getEffectiveDefinition(input)
      : input.context === SEARCH_BLENDED_CONTEXT
        ? searchBlendedContextProvider.getEffectiveDefinition(input)
      : adminAuditContextProvider.getEffectiveDefinition(input),
}

const adminExecuteFilterQuery = new ExecuteFilterQuery({
  contextProvider: filterContextProvider,
  permissionProvider: new AdminAuditPermissionProvider(auditAuthorizationReader),
  executorResolver: {
    getExecutor: (profile) => filterContextRegistry().getExecutor(profile),
  },
  timeoutMs: 10_000,
  hashGenerator: filterHashGenerator,
  observabilitySink: filterObservabilityLoggerSink,
})

export const executeFilterQuery = {
  execute<T = unknown>(input: Parameters<typeof adminExecuteFilterQuery.execute>[0]) {
    return input.criteria.context === TASK_DISCOVERY_CONTEXTS.public ||
      input.criteria.context === TASK_DISCOVERY_CONTEXTS.member
      ? taskDiscoveryFilter.execute<T>(input)
      : adminExecuteFilterQuery.execute<T>(input)
  },
  executeAndWrap<T = unknown>(input: Parameters<typeof adminExecuteFilterQuery.execute>[0]) {
    return input.criteria.context === TASK_DISCOVERY_CONTEXTS.public ||
      input.criteria.context === TASK_DISCOVERY_CONTEXTS.member
      ? taskDiscoveryFilter.executeAndWrap<T>(input)
      : adminExecuteFilterQuery.executeAndWrap<T>(input)
  },
}

const taxonomyReferenceRepository = new PostgresFilterSavedViewTaxonomyReferenceRepository()
const savedViewRepository = new TaxonomyReferenceProjectingFilterSavedViewRepository(
  new PostgresFilterSavedViewRepository(),
  taxonomyReferenceRepository,
  new LucidTaxonomyVersionReader()
)
export const filterAlertRepository = new PostgresFilterAlertRepository()
const savedViewTransactions = new LucidFilterTransactionRunner()
export const savedViewAuthorization = new PostgresFilterSavedViewAuthorization()
export const createFilterAlert = new CreateFilterAlertCommand(
  savedViewRepository,
  filterAlertRepository,
  savedViewAuthorization,
  filterContextProvider
)
export const updateFilterAlert = new UpdateFilterAlertCommand(
  savedViewRepository,
  filterAlertRepository,
  savedViewAuthorization
)
export const getFilterAlert = new GetFilterAlertQuery(
  savedViewRepository,
  filterAlertRepository,
  savedViewAuthorization
)

export const createSavedFilterView = new CreateSavedFilterViewCommand(
  savedViewTransactions,
  savedViewRepository,
  savedViewAuthorization,
  filterContextProvider,
  filterHashGenerator
)
export const updateSavedFilterView = new UpdateSavedFilterViewCommand(
  savedViewTransactions,
  savedViewRepository,
  savedViewAuthorization,
  filterContextProvider,
  filterHashGenerator
)
export const deleteSavedFilterView = new DeleteSavedFilterViewCommand(
  savedViewTransactions,
  savedViewRepository,
  savedViewAuthorization
)
export const duplicateSavedFilterView = new DuplicateSavedFilterViewCommand(
  savedViewTransactions,
  savedViewRepository,
  savedViewAuthorization,
  filterContextProvider,
  filterHashGenerator
)
export const shareSavedFilterView = new ShareSavedFilterViewCommand(
  savedViewTransactions,
  savedViewRepository,
  savedViewAuthorization,
  filterContextProvider,
  filterHashGenerator
)
export const listSavedFilterViews = new ListSavedFilterViewsQuery(
  savedViewRepository,
  savedViewAuthorization
)
export const getSavedFilterView = new GetSavedFilterViewQuery(
  savedViewRepository,
  savedViewAuthorization
)
export const executeSavedFilterView = new ExecuteSavedFilterViewQuery(
  savedViewRepository,
  savedViewAuthorization,
  filterContextProvider,
  executeFilterQuery
)

export const createFilterAlertWorkflow = new CreateFilterAlertWorkflow(
  getSavedFilterView,
  executeSavedFilterView,
  filterContextProvider,
  createFilterAlert
)

export const coordinateTaxonomyFilterConsumers = new CoordinateTaxonomyFilterConsumersCommand(
  savedViewRepository,
  taxonomyReferenceRepository,
  new PostgresFilterSavedViewMigrationRunRepository(),
  savedViewTransactions,
  new PostgresFilterAlertPauseAdapter(filterAlertRepository),
  new PostgresFilterTaxonomyMigrationRunRepository(),
  filterHashGenerator
)

export const filterAlertEvaluator = new PostgresFilterAlertEvaluator(
  savedViewRepository,
  savedViewAuthorization,
  executeSavedFilterView,
  new PostgresFilterAlertPrincipalResolver()
)

export const filterAlertDelivery = new PostgresFilterAlertNotificationDelivery()

class ComposedFilteringActionFactory extends FilteringActionFactory {
  readonly createRequestId = randomUUID
  readonly filterContextProvider = filterContextProvider
  readonly executeFilterQuery = executeFilterQuery
  readonly createSavedFilterView = createSavedFilterView
  readonly updateSavedFilterView = updateSavedFilterView
  readonly deleteSavedFilterView = deleteSavedFilterView
  readonly duplicateSavedFilterView = duplicateSavedFilterView
  readonly shareSavedFilterView = shareSavedFilterView
  readonly createFilterAlert = createFilterAlert
  readonly createFilterAlertWorkflow = createFilterAlertWorkflow
  readonly updateFilterAlert = updateFilterAlert
  readonly getSavedFilterView = getSavedFilterView
  readonly listSavedFilterViews = listSavedFilterViews
  readonly executeSavedFilterView = executeSavedFilterView
  readonly getFilterAlert = getFilterAlert
  readonly savedViewAuthorization = savedViewAuthorization
  readonly coordinateTaxonomyFilterConsumers = coordinateTaxonomyFilterConsumers
}

export const filteringActionFactory = new ComposedFilteringActionFactory()
