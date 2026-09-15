import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'
import { ValidationError as VineValidationError } from '@vinejs/vine'

import { isPolicyViolationException } from '#modules/authorization/public_contracts/policy_violation'
import AppException from '#modules/errors/public_contracts/application_exception'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import {
  ErrorCode,
  ErrorMessages,
  HttpStatus,
} from '#modules/errors/public_contracts/error_constants'
import { sanitizeRequestUrl } from '#modules/errors/public_contracts/error_sanitization'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import PostgresException from '#modules/errors/public_contracts/postgres_exception'

export interface HttpError {
  status: number
  code?: string
  message?: string
  messages?: unknown
}

export interface ErrorWithDefaultHeaders {
  getDefaultHeaders(): Record<string, unknown>
}

interface RuntimeHttpContext {
  request?: {
    url?: () => unknown
    method?: () => unknown
    ip?: () => unknown
    header?: (name: string) => unknown
  }
  requestContext?: {
    requestId?: unknown
    correlationId?: unknown
  }
  auth?: {
    user?: {
      id?: unknown
    }
  }
  session?: {
    get?: (key: string) => unknown
  }
}

export interface RequestMetadata {
  requestId: string | null
  correlationId: string | null
  actorUserId: string | null
  actorOrgId: string | null
  method: string | null
  url: string | null
  ipAddress: string | null
  userAgent: string | null
}

function readString(readValue: () => unknown): string | null {
  try {
    const value = readValue()
    return typeof value === 'string' && value.length > 0 ? value : null
  } catch {
    return null
  }
}

export function getRequestMetadata(ctx: HttpContext): RequestMetadata {
  const runtimeCtx = ctx as unknown as RuntimeHttpContext

  return {
    requestId: readString(() => runtimeCtx.requestContext?.requestId),
    correlationId: readString(() => runtimeCtx.requestContext?.correlationId),
    actorUserId: readString(() => runtimeCtx.auth?.user?.id),
    actorOrgId: readString(() => runtimeCtx.session?.get?.('current_organization_id')),
    method: readString(() => runtimeCtx.request?.method?.()),
    url: sanitizeRequestUrl(readString(() => runtimeCtx.request?.url?.())),
    ipAddress: readString(() => runtimeCtx.request?.ip?.()),
    userAgent: readString(() => runtimeCtx.request?.header?.('user-agent')),
  }
}

/**
 * Only application and framework exceptions may control the HTTP response status.
 * A plain object with a `status` property is untrusted and must remain a safe 500.
 */
export const isHttpError = (err: unknown): err is HttpError => {
  return (
    (err instanceof AppException ||
      err instanceof Exception ||
      err instanceof VineValidationError) &&
    Number.isInteger((err as HttpError).status) &&
    (err as HttpError).status >= 400 &&
    (err as HttpError).status <= 599
  )
}

export const hasDefaultHeaders = (error: unknown): error is ErrorWithDefaultHeaders => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'getDefaultHeaders' in error &&
    typeof error.getDefaultHeaders === 'function'
  )
}

export const applyDefaultHeaders = (
  response: HttpContext['response'],
  error: ErrorWithDefaultHeaders
): void => {
  const headers = error.getDefaultHeaders()
  for (const [key, value] of Object.entries(headers)) {
    response.header(key, String(value))
  }
}

/**
 * Kiểm tra xem request có phải là Inertia request không
 */
export const isInertiaRequest = (request: HttpContext['request']): boolean => {
  return !!request.header('X-Inertia')
}

export const requestAllowsAutomaticRetry = (request: HttpContext['request']): boolean => {
  try {
    const method = request.method().toUpperCase()
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true
    }
    return Boolean(request.header('Idempotency-Key')?.trim())
  } catch {
    return false
  }
}

/**
 * Map HTTP status code sang ErrorCode string
 */
export function getErrorCodeFromStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ErrorCode.BUSINESS_LOGIC
    case HttpStatus.UNAUTHORIZED:
      return ErrorCode.UNAUTHORIZED
    case HttpStatus.FORBIDDEN:
      return ErrorCode.FORBIDDEN
    case HttpStatus.NOT_FOUND:
      return ErrorCode.NOT_FOUND
    case HttpStatus.METHOD_NOT_ALLOWED:
      return ErrorCode.METHOD_NOT_ALLOWED
    case HttpStatus.REQUEST_TIMEOUT:
      return ErrorCode.REQUEST_TIMEOUT
    case HttpStatus.CONFLICT:
      return ErrorCode.CONFLICT
    case HttpStatus.PAYLOAD_TOO_LARGE:
      return ErrorCode.PAYLOAD_TOO_LARGE
    case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
      return ErrorCode.UNSUPPORTED_MEDIA_TYPE
    case HttpStatus.CSRF_EXPIRED:
      return ErrorCode.CSRF_EXPIRED
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return ErrorCode.VALIDATION
    case HttpStatus.RATE_LIMIT:
      return ErrorCode.RATE_LIMIT
    case HttpStatus.BAD_GATEWAY:
      return ErrorCode.BAD_GATEWAY
    case HttpStatus.SERVICE_UNAVAILABLE:
      return ErrorCode.SERVICE_UNAVAILABLE
    case HttpStatus.GATEWAY_TIMEOUT:
      return ErrorCode.GATEWAY_TIMEOUT
    default:
      return ErrorCode.INTERNAL
  }
}

export function getSafeClientMessage(error: unknown, status: number): string {
  if (error instanceof AppException) {
    return error.safeMessage
  }

  if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
    switch (status) {
      case HttpStatus.BAD_GATEWAY:
        return ErrorMessages.BAD_GATEWAY
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorMessages.SERVICE_UNAVAILABLE
      case HttpStatus.GATEWAY_TIMEOUT:
        return ErrorMessages.GATEWAY_TIMEOUT
      default:
        return ErrorMessages.INTERNAL_ERROR
    }
  }

  switch (status) {
    case HttpStatus.BAD_REQUEST:
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return ErrorMessages.INVALID_INPUT
    case HttpStatus.UNAUTHORIZED:
      return ErrorMessages.PLEASE_LOGIN
    case HttpStatus.FORBIDDEN:
      return ErrorMessages.FORBIDDEN
    case HttpStatus.NOT_FOUND:
      return ErrorMessages.NOT_FOUND
    case HttpStatus.METHOD_NOT_ALLOWED:
      return ErrorMessages.METHOD_NOT_ALLOWED
    case HttpStatus.REQUEST_TIMEOUT:
      return ErrorMessages.REQUEST_TIMEOUT
    case HttpStatus.CONFLICT:
      return ErrorMessages.ALREADY_EXISTS
    case HttpStatus.PAYLOAD_TOO_LARGE:
      return ErrorMessages.PAYLOAD_TOO_LARGE
    case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
      return ErrorMessages.UNSUPPORTED_MEDIA_TYPE
    case HttpStatus.CSRF_EXPIRED:
      return ErrorMessages.CSRF_EXPIRED
    case HttpStatus.RATE_LIMIT:
      return ErrorMessages.RATE_LIMIT
    default:
      return ErrorMessages.GENERIC_ERROR
  }
}

export function mapDomainException(error: unknown): unknown {
  const postgresException = PostgresException.from(error)
  if (postgresException !== null) {
    return postgresException
  }

  if (!isPolicyViolationException(error)) {
    return error
  }

  if (error.policyCode === 'FORBIDDEN') {
    return new ForbiddenException(error.reason)
  }

  return new BusinessLogicException(error.reason)
}

/**
 * Flatten VineJS validation errors thành Record<string, string>
 */
export function flattenValidationErrors(messages: unknown): Record<string, string> {
  const errors: Record<string, string> = {}

  if (Array.isArray(messages)) {
    for (const msg of messages) {
      if (msg && typeof msg === 'object' && 'field' in msg && 'message' in msg) {
        const msgRecord = msg as Record<string, unknown>
        errors[String(msgRecord['field'])] = String(msgRecord['message'])
      }
    }
  } else if (messages && typeof messages === 'object') {
    for (const [key, value] of Object.entries(messages as Record<string, unknown>)) {
      if (typeof value === 'string') {
        errors[key] = value
      } else if (Array.isArray(value) && value.length > 0) {
        errors[key] = String(value[0])
      }
    }
  }

  return errors
}
