import type { ApplicationService } from '@adonisjs/core/types'

import { ErrorHttpErrorEventReporterAdapter } from './adapters/error_http_error_event_reporter_adapter.js'

import { errorReportingConfig } from '#config/error_reporting'
import {
  closeAndDrainErrorEvents,
  startErrorEventReporting,
} from '#modules/errors/infra/repositories/error_event_repository'
import { HttpErrorEventReporter } from '#modules/http/actions/ports/outbound/http_error_event_reporter'
import loggerService from '#modules/logger/public_contracts/application_logger'

/**
 * Registers with the framework lifecycle so the framework remains the sole
 * process-signal owner. Application terminating hooks run before datastore
 * providers are shut down.
 */
export default class ErrorReportingLifecycleProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    this.app.container.singleton(
      HttpErrorEventReporter,
      () => new ErrorHttpErrorEventReporterAdapter()
    )
  }

  boot(): void {
    startErrorEventReporting()
    this.app.terminating(async () => {
      const result = await closeAndDrainErrorEvents()
      if (result === 'timed_out') {
        loggerService.warn('[ErrorEventReporter] Shutdown drain budget exhausted', {
          shutdownDrainMs: errorReportingConfig.shutdownDrainMs,
        })
      }
    })
  }
}
