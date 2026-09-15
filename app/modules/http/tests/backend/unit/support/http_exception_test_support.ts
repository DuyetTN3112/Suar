import type { HttpContext } from '@adonisjs/core/http'

import { HttpErrorEventReporter } from '#modules/http/actions/ports/outbound/http_error_event_reporter'
import HttpExceptionHandler from '#modules/http/exceptions/handler'

export class NoopHttpErrorEventReporter extends HttpErrorEventReporter {
  override enqueue(): void {}
}

export function makeExceptionHandler(): HttpExceptionHandler {
  return new HttpExceptionHandler(new NoopHttpErrorEventReporter())
}

export function toHttpContext(value: unknown): HttpContext {
  return value as HttpContext
}

export interface ResponseState {
  statusCode: number
  headers: Record<string, string>
  payload: unknown
}

export function createCanonicalApiContext(
  path: string = '/api/v1/test',
  requestOptions: {
    method?: string
    idempotencyKey?: string
  } = {}
): {
  ctx: HttpContext
  responseState: ResponseState
} {
  const responseState: ResponseState = {
    statusCode: 200,
    headers: {},
    payload: null,
  }
  const ctx = {
    httpTransportKind: 'api-canonical',
    request: {
      url: () => path,
      method: () => requestOptions.method ?? 'GET',
      ip: () => '127.0.0.1',
      header: (name: string) =>
        name.toLowerCase() === 'idempotency-key'
          ? (requestOptions.idempotencyKey ?? null)
          : null,
      accepts: () => 'json',
    },
    response: {
      status(code: number) {
        responseState.statusCode = code
        return this
      },
      header(name: string, value: string) {
        responseState.headers[name.toLowerCase()] = value
        return this
      },
      json(payload: unknown) {
        responseState.payload = payload
        return this
      },
    },
    session: {
      flash() {},
      put() {},
      get() {
        return null
      },
    },
    auth: {
      user: null,
    },
    inertia: {
      location() {},
    },
    requestContext: {
      requestId: 'req_test',
      correlationId: 'corr_test',
    },
  }

  return { ctx: toHttpContext(ctx), responseState }
}
