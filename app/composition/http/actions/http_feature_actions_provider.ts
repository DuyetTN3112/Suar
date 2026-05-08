import type { ApplicationService } from '@adonisjs/core/types'

import { HttpGlobalSearchReaderAdapter } from '#composition/adapters/http/http_global_search_reader_adapter'
import { HttpHealthRuntimeReaderAdapter } from '#composition/adapters/http/http_health_runtime_reader_adapter'
import { HttpOrganizationMembersReaderAdapter } from '#composition/adapters/http/http_organization_members_reader_adapter'
import { HttpPlatformUiEventWriterAdapter } from '#composition/adapters/http/http_platform_ui_event_writer_adapter'
import { HttpSearchDiscoveryReaderAdapter } from '#composition/adapters/http/http_search_discovery_reader_adapter'
import { HttpSearchUiEventWriterAdapter } from '#composition/adapters/http/http_search_ui_event_writer_adapter'

import ComposedHttpCacheActionFactory from '#composition/http/cache/factories/composed_http_cache_action_factory'
import { getOrganizationMembersApi } from '#composition/organizations/search/organization_search_composition'
import { platformUiEventsCapability } from '#composition/observability/platform/platform_ui_events_composition'
import {
  applySearchIndexCleanupCommand,
  applySearchIndexRollbackCommand,
  inspectSearchIndicesQuery,
  previewSearchIndexCleanupQuery,
  previewSearchIndexRollbackQuery,
} from '#composition/search/index-administration/search_index_administration_composition'
import { authorizeSearchIndexOperatorQuery } from '#composition/search/index-administration/search_index_operator_composition'
import {
  applySearchIndexActivationCommand,
  previewSearchIndexActivationQuery,
  reconcileSearchProjectionGenerationCommand,
} from '#composition/search/projection-generation/search_projection_generation_composition'
import { searchPublicApi } from '#composition/search/public-api/search_public_api_composition'
import { searchUiEventsCapability } from '#composition/search/ui-events/search_ui_events_composition'
import RestartDevelopmentServerCommand from '#modules/http/actions/commands/runtime/restart_development_server_command'
import RecordPlatformUiEventCommand from '#modules/http/actions/commands/search-discovery/record_platform_ui_event_command'
import RecordSearchUiEventCommand from '#modules/http/actions/commands/search-discovery/record_search_ui_event_command'
import { HttpCacheActionFactory } from '#modules/http/actions/ports/inbound/http_cache_action_factory'
import GetOrganizationMembersQuery from '#modules/http/actions/queries/organization/get_organization_members_query'
import { GetCacheMetricsQuery } from '#modules/http/actions/queries/runtime/get_cache_metrics_query'
import GetHealthReportQuery from '#modules/http/actions/queries/runtime/get_health_report_query'
import GetGlobalSearchQuery from '#modules/http/actions/queries/search-discovery/get_global_search_query'
import GetSearchDiscoveryQuery from '#modules/http/actions/queries/search-discovery/get_search_discovery_query'
import AdminSearchProjectionController, {
  type AdminSearchProjectionDependencies,
} from '#modules/http/controllers/search-discovery/admin_search_projection_controller'
import { NodeDevelopmentServerRestarter } from '#modules/http/infra/adapters/runtime/node_development_server_restarter'

export default class HttpFeatureActionsProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    const search = new HttpGlobalSearchReaderAdapter(searchPublicApi)
    const searchDiscovery = new HttpSearchDiscoveryReaderAdapter(searchPublicApi)
    const healthRuntime = new HttpHealthRuntimeReaderAdapter()

    const adminSearchProjectionDependencies: AdminSearchProjectionDependencies = {
      authorize: authorizeSearchIndexOperatorQuery,
      inspect: inspectSearchIndicesQuery,
      previewCleanup: previewSearchIndexCleanupQuery,
      applyCleanup: applySearchIndexCleanupCommand,
      previewRollback: previewSearchIndexRollbackQuery,
      applyRollback: applySearchIndexRollbackCommand,
      previewActivation: previewSearchIndexActivationQuery,
      applyActivation: applySearchIndexActivationCommand,
      reconcile: reconcileSearchProjectionGenerationCommand,
    }
    this.app.container.singleton(
      AdminSearchProjectionController,
      () => new AdminSearchProjectionController(adminSearchProjectionDependencies)
    )

    this.app.container.singleton(HttpCacheActionFactory, () => new ComposedHttpCacheActionFactory())
    this.app.container.singleton(
      GetOrganizationMembersQuery,
      () =>
        new GetOrganizationMembersQuery(
          new HttpOrganizationMembersReaderAdapter(getOrganizationMembersApi)
        )
    )
    this.app.container.singleton(GetGlobalSearchQuery, () => new GetGlobalSearchQuery(search))
    this.app.container.singleton(
      GetSearchDiscoveryQuery,
      () => new GetSearchDiscoveryQuery(searchDiscovery)
    )
    this.app.container.singleton(
      GetHealthReportQuery,
      () => new GetHealthReportQuery(healthRuntime)
    )
    this.app.container.singleton(
      GetCacheMetricsQuery,
      () => new GetCacheMetricsQuery(healthRuntime)
    )
    this.app.container.singleton(
      RestartDevelopmentServerCommand,
      () => new RestartDevelopmentServerCommand(new NodeDevelopmentServerRestarter())
    )
    this.app.container.singleton(
      RecordSearchUiEventCommand,
      () =>
        new RecordSearchUiEventCommand(new HttpSearchUiEventWriterAdapter(searchUiEventsCapability))
    )
    this.app.container.singleton(
      RecordPlatformUiEventCommand,
      () =>
        new RecordPlatformUiEventCommand(
          new HttpPlatformUiEventWriterAdapter(platformUiEventsCapability)
        )
    )
  }
}
