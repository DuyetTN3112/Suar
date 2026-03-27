import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  getNotificationDefinition,
  isCanonicalNotificationType,
} from '#modules/notifications/domain/notification_catalog'
import {
  canonicalNotificationJson,
  NOTIFICATION_LIMITS,
  type NotificationJsonValue,
} from '#modules/notifications/domain/notification_limits'
import type { NotificationCommandV1Input } from '#modules/notifications/public_contracts/notification_command'
import type { BackendNotificationType } from '#modules/notifications/public_contracts/notification_constants'

export type { NotificationCommandV1Input }

export interface NotificationCommandV1 extends Omit<
  NotificationCommandV1Input,
  'type' | 'parameters'
> {
  type: BackendNotificationType
  parameters: Record<string, NotificationJsonValue>
}

export interface ParsedNotificationCommandV1 {
  command: NotificationCommandV1
  fingerprint: string
}

export interface NotificationCommandParserOptions {
  now?: Date
  digest(canonicalValue: string): string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const IDENTITY_TYPE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/u
const allowedRootKeys = new Set([
  'eventId',
  'type',
  'schemaVersion',
  'recipientId',
  'scope',
  'actor',
  'subject',
  'parameters',
  'occurredAt',
  'correlationId',
  'dedupeKey',
])

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvariantViolationException(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

function requireBoundedString(
  value: unknown,
  label: string,
  maximum: number = NOTIFICATION_LIMITS.identityCharacters
): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum) {
    throw new InvariantViolationException(
      `${label} must be a non-empty string of at most ${maximum} characters`
    )
  }
  return value
}

function requireUuid(value: unknown, label: string): string {
  const text = requireBoundedString(value, label)
  if (!UUID_PATTERN.test(text)) {
    throw new InvariantViolationException(`${label} must be a UUID`)
  }
  return text.toLowerCase()
}

function parseIdentity(value: unknown, label: string): { type: string; id: string } | undefined {
  if (value === undefined) {
    return undefined
  }
  const record = requireRecord(value, label)
  const type = requireBoundedString(record['type'], `${label}.type`, 64)
  if (!IDENTITY_TYPE_PATTERN.test(type)) {
    throw new InvariantViolationException(`${label}.type must use lowercase snake_case`)
  }
  const id = requireBoundedString(record['id'], `${label}.id`)
  return { type, id }
}

function parseScope(value: unknown): NotificationCommandV1['scope'] {
  const record = requireRecord(value, 'Notification scope')
  const kind = record['kind']

  if (kind === 'system') {
    return { kind }
  }
  if (kind === 'user' || kind === 'organization') {
    return {
      kind,
      id: requireBoundedString(record['id'], 'Notification scope id'),
    }
  }
  throw new InvariantViolationException(
    'Notification scope kind must be user, organization, or system'
  )
}

function parseOccurredAt(value: unknown, now: Date): string {
  const text = requireBoundedString(value, 'Notification occurredAt', 64)
  const occurredAt = new Date(text)
  if (Number.isNaN(occurredAt.getTime())) {
    throw new InvariantViolationException('Notification occurredAt must be an ISO-8601 timestamp')
  }

  const ageMs = now.getTime() - occurredAt.getTime()
  const maximumAgeMs = NOTIFICATION_LIMITS.onlineIdempotencyDays * 24 * 60 * 60 * 1_000
  const futureSkewMs = NOTIFICATION_LIMITS.futureClockSkewMinutes * 60 * 1_000

  if (ageMs > maximumAgeMs) {
    throw new InvariantViolationException(
      'Notification occurrence is older than the 180 days online horizon'
    )
  }
  if (ageMs < -futureSkewMs) {
    throw new InvariantViolationException(
      'Notification occurrence is more than 5 minutes in the future'
    )
  }

  return occurredAt.toISOString()
}

function fingerprintFor(
  command: NotificationCommandV1,
  digest: NotificationCommandParserOptions['digest']
): string {
  const semanticValue: NotificationJsonValue = {
    eventId: command.eventId,
    type: command.type,
    schemaVersion: command.schemaVersion,
    recipientId: command.recipientId,
    scope: command.scope,
    actor: command.actor ?? null,
    subject: command.subject ?? null,
    parameters: command.parameters,
    occurredAt: command.occurredAt,
    dedupeKey: command.dedupeKey ?? null,
  }

  return digest(canonicalNotificationJson(semanticValue))
}

export function parseNotificationCommandV1(
  value: unknown,
  options: NotificationCommandParserOptions
): ParsedNotificationCommandV1 {
  const input = requireRecord(value, 'Notification command')
  const unknownKeys = Object.keys(input).filter((key) => !allowedRootKeys.has(key))
  if (unknownKeys.length > 0) {
    throw new InvariantViolationException(
      `Notification recipient contract is singular; unsupported fields: ${unknownKeys.join(', ')}`
    )
  }

  if (input['schemaVersion'] !== 1) {
    throw new InvariantViolationException(
      'Unsupported notification schema version; expected version 1'
    )
  }

  const type = requireBoundedString(input['type'], 'Notification type')
  if (!isCanonicalNotificationType(type)) {
    throw new InvariantViolationException(`Unknown notification type "${type}"`)
  }
  const definition = getNotificationDefinition(type)
  if (!definition) {
    throw new InvariantViolationException(`Unknown notification type "${type}"`)
  }

  const correlationId =
    input['correlationId'] === undefined
      ? undefined
      : requireBoundedString(
          input['correlationId'],
          'Notification correlationId',
          NOTIFICATION_LIMITS.correlationIdCharacters
        )
  const dedupeKey =
    input['dedupeKey'] === undefined
      ? undefined
      : requireBoundedString(
          input['dedupeKey'],
          'Notification dedupeKey',
          NOTIFICATION_LIMITS.dedupeKeyCharacters
        )
  const actor = parseIdentity(input['actor'], 'Notification actor')
  const subject = parseIdentity(input['subject'], 'Notification subject')

  const command: NotificationCommandV1 = {
    eventId: requireUuid(input['eventId'], 'Notification eventId'),
    type,
    schemaVersion: 1,
    recipientId: requireUuid(input['recipientId'], 'Notification recipientId'),
    scope: parseScope(input['scope']),
    parameters: definition.validateParameters(input['parameters']),
    occurredAt: parseOccurredAt(input['occurredAt'], options.now ?? new Date()),
    ...(actor === undefined ? {} : { actor }),
    ...(subject === undefined ? {} : { subject }),
    ...(correlationId === undefined ? {} : { correlationId }),
    ...(dedupeKey === undefined ? {} : { dedupeKey }),
  }

  return {
    command,
    fingerprint: fingerprintFor(command, (canonicalValue) => options.digest(canonicalValue)),
  }
}
