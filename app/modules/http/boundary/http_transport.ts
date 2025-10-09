import type { HttpContext } from '@adonisjs/core/http'

export type HttpTransportKind =
  | 'page'
  | 'api-canonical'
  | 'api-compat'
  | 'api-admin-internal'
  | 'api-public-callback'
  | 'api-ops-internal'

type HttpTransportRequest = HttpContext['request']

export interface BoundHttpTransportSource {
  request: HttpTransportRequest
  httpTransportKind?: HttpTransportKind
}

type HttpTransportSource = BoundHttpTransportSource | HttpTransportRequest

function hasBoundTransport(source: HttpTransportSource): source is BoundHttpTransportSource {
  return 'httpTransportKind' in source
}

function hasRequestEnvelope(source: HttpTransportSource): source is BoundHttpTransportSource {
  return 'request' in source
}

function resolveRequest(source: HttpTransportSource): HttpTransportRequest {
  return hasRequestEnvelope(source) ? source.request : source
}

export function classifyHttpTransport(source: HttpTransportSource): HttpTransportKind {
  if (hasBoundTransport(source) && source.httpTransportKind) {
    return source.httpTransportKind
  }

  const request = resolveRequest(source)

  if (request.header('X-Inertia')) {
    return 'page'
  }

  return request.accepts(['json', 'html']) === 'json'
    ? 'api-compat'
    : 'page'
}

export function isApiTransport(kind: HttpTransportKind): boolean {
  return kind !== 'page'
}

export function isCanonicalApiTransport(
  kind: HttpTransportKind
): boolean {
  return kind === 'api-canonical'
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    httpTransportKind?: HttpTransportKind
  }
}
