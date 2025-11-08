import { platformOperationalLogger, type PlatformOperationalLogger } from '#modules/observability/public_contracts/platform_observability'
import { isSearchEnabled, searchClient } from '#modules/search/infra/search_client'
import { buildSearchRuntimeEvent } from '#modules/search/observability/search_event_factory'

interface SearchRuntimeClient {
  ping(): Promise<boolean>
}

export class SearchRuntimeService {
  constructor(
    private readonly client: SearchRuntimeClient = searchClient,
    private readonly enabledResolver: () => boolean = isSearchEnabled,
    private readonly operationalLogger: Pick<PlatformOperationalLogger, 'log'> = platformOperationalLogger
  ) {}

  isEnabled(): boolean {
    return this.enabledResolver()
  }

  async ping(): Promise<boolean> {
    try {
      return await this.client.ping()
    } catch (error) {
      this.operationalLogger.log(
        'warn',
        buildSearchRuntimeEvent({
          eventName: 'search.runtime.ping_failed',
          workflow: 'search_runtime_ping',
          stage: 'failed',
          outcome: 'failure',
          runtime: {
            enabled: this.isEnabled(),
          },
          error: {
            class: error instanceof Error ? error.name : 'UnknownError',
            message: error instanceof Error ? error.message : String(error),
          },
        })
      )

      throw error
    }
  }
}
