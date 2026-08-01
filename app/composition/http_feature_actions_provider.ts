import type { ApplicationService } from '@adonisjs/core/types'

import { HttpGlobalSearchReaderAdapter } from './adapters/http_global_search_reader_adapter.js'
import { HttpHealthRuntimeReaderAdapter } from './adapters/http_health_runtime_reader_adapter.js'
import { HttpOrganizationMembersReaderAdapter } from './adapters/http_organization_members_reader_adapter.js'
import { HttpPlatformUiEventWriterAdapter } from './adapters/http_platform_ui_event_writer_adapter.js'
import { HttpSearchUiEventWriterAdapter } from './adapters/http_search_ui_event_writer_adapter.js'
import ComposedHttpCacheActionFactory from './factories/composed_http_cache_action_factory.js'

import { getOrganizationMembersApi } from '#composition/organization_search_composition'
import { platformUiEventsCapability } from '#composition/platform_ui_events_composition'
import { searchPublicApi } from '#composition/search_public_api_composition'
import { searchUiEventsCapability } from '#composition/search_ui_events_composition'
import RecordPlatformUiEventCommand from '#modules/http/actions/commands/record_platform_ui_event_command'
import RecordSearchUiEventCommand from '#modules/http/actions/commands/record_search_ui_event_command'
import { RestartDevelopmentServerCommand } from '#modules/http/actions/commands/restart_development_server_command'
import { HttpCacheActionFactory } from '#modules/http/actions/ports/inbound/http_cache_action_factory'
import { GetCacheMetricsQuery } from '#modules/http/actions/queries/get_cache_metrics_query'
import GetGlobalSearchQuery from '#modules/http/actions/queries/get_global_search_query'
import { GetHealthReportQuery } from '#modules/http/actions/queries/get_health_report_query'
import GetOrganizationMembersQuery from '#modules/http/actions/queries/get_organization_members_query'
import { NodeDevelopmentServerRestarter } from '#modules/http/infra/adapters/node_development_server_restarter'

export default class HttpFeatureActionsProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    const search = new HttpGlobalSearchReaderAdapter(searchPublicApi)
    const healthRuntime = new HttpHealthRuntimeReaderAdapter()

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
