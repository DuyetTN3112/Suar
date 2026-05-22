import type { FilterObservabilitySink } from '#modules/filtering/actions/ports/outbound/filter_observability_sink'
import type { FilterObservabilityEvent } from '#modules/filtering/observability/filtering-observability/filter_event_factory'
import { toFilterObservabilityLogPayload } from '#modules/filtering/observability/filtering-observability/filter_observability_log_payload'
import {
  shouldEmitFilterObservabilityEvent,
  type FilterObservabilitySamplingPolicy,
} from '#modules/filtering/observability/filtering-observability/filter_observability_sampling_policy'
import loggerService from '#modules/logger/public_contracts/application_logger'
export interface FilterObservabilityLogger {
  logStructured(level: 'error' | 'info', eventName: string, payload: Record<string, unknown>): void
}

export interface FilterObservabilityLoggerSinkOptions {
  readonly logger?: FilterObservabilityLogger
  readonly sampleRate?: FilterObservabilitySamplingPolicy['sampleRate']
  readonly random?: FilterObservabilitySamplingPolicy['random']
}

function logLevelFor(outcome: FilterObservabilityEvent['outcome']): 'error' | 'info' {
  if (outcome === 'failure' || outcome === 'timeout') return 'error'
  return 'info'
}

export class FilterObservabilityLoggerSink implements FilterObservabilitySink {
  private readonly logger: FilterObservabilityLogger
  private readonly sampleRate: number
  private readonly random: () => number

  constructor(options: FilterObservabilityLoggerSinkOptions = {}) {
    this.logger = options.logger ?? loggerService
    this.sampleRate = options.sampleRate ?? 1
    this.random = options.random ?? Math.random
    if (!Number.isFinite(this.sampleRate) || this.sampleRate < 0 || this.sampleRate > 1) {
      throw new RangeError('Filter observability sampleRate must be between 0 and 1')
    }
  }

  record(event: FilterObservabilityEvent): void {
    if (
      !shouldEmitFilterObservabilityEvent(event.outcome, {
        sampleRate: this.sampleRate,
        random: this.random,
      })
    )
      return

    this.logger.logStructured(
      logLevelFor(event.outcome),
      event.event_name,
      toFilterObservabilityLogPayload(event)
    )
  }
}

export const filterObservabilityLoggerSink = new FilterObservabilityLoggerSink()
