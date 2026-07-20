import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import {
  platformOperationalLogger,
  type PlatformOperationalLogger,
} from '#modules/observability/public_contracts/platform_observability'
import type { SearchRuntimeClientPort } from '#modules/search/actions/ports/outbound/search_runtime_client_port'
import type { SearchRuntimeStatusPort } from '#modules/search/actions/ports/outbound/search_runtime_status_port'
import { buildSearchRuntimeEvent } from '#modules/search/public_contracts/search_runtime_event'

export class SearchRuntimeAdapter {
  constructor(
    private readonly client: SearchRuntimeClientPort,
    private readonly status: SearchRuntimeStatusPort,
    private readonly operationalLogger: Pick<
      PlatformOperationalLogger,
      'log'
    > = platformOperationalLogger
  ) {}

  isEnabled(): boolean {
    return this.status.isEnabled()
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
          error: serializeObservabilityError(error),
        })
      )

      throw error
    }
  }
}
