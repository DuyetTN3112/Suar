import { enqueueErrorEvent } from '#modules/errors/infra/repositories/error_event_repository'
import {
  type HttpErrorEventPayload,
  HttpErrorEventReporter,
} from '#modules/http/actions/ports/outbound/http_error_event_reporter'

export class ErrorHttpErrorEventReporterAdapter extends HttpErrorEventReporter {
  override enqueue(payload: HttpErrorEventPayload): void {
    enqueueErrorEvent(payload)
  }
}
