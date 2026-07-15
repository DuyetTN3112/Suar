import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'

type CursorScalar = string | number | boolean | null

export interface ElasticsearchCursorSort {
  readonly field: string
  readonly direction: 'asc' | 'desc'
}

export interface ElasticsearchCursorIdentity {
  readonly context: string
  readonly schemaVersion: number
  readonly criteriaHash: string
  readonly authorizationHash: string
  readonly sort: readonly ElasticsearchCursorSort[]
  readonly rankingVersion: string
  readonly indexGeneration: string
}

export interface ElasticsearchCursorPayload extends ElasticsearchCursorIdentity {
  readonly searchAfter: readonly CursorScalar[]
  readonly tieBreakId: string
  readonly consumed?: number
  readonly pitId?: string
}

interface StoredCursorPayload extends ElasticsearchCursorPayload {
  readonly version: 1
  readonly expiresAt: number
}

export interface ElasticsearchCursorCodecOptions {
  readonly secret: string
  readonly ttlMs: number
  readonly clock?: () => Date
}

export class ElasticsearchCursorCodec {
  readonly #key: Buffer
  readonly #ttlMs: number
  readonly #clock: () => Date

  constructor({ secret, ttlMs, clock = () => new Date() }: ElasticsearchCursorCodecOptions) {
    if (Buffer.byteLength(secret, 'utf8') < 32 || !Number.isSafeInteger(ttlMs) || ttlMs < 1) {
      criteriaError()
    }
    this.#key = createHash('sha256').update(secret, 'utf8').digest()
    this.#ttlMs = ttlMs
    this.#clock = clock
  }

  get ttlMs(): number {
    return this.#ttlMs
  }

  encode(payload: ElasticsearchCursorPayload): string {
    validateIdentity(payload)
    validatePageState(payload)
    const now = this.#clock().getTime()
    if (!Number.isFinite(now)) criteriaError()
    const stored: StoredCursorPayload = {
      ...payload,
      version: 1,
      expiresAt: now + this.#ttlMs,
    }
    const nonce = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.#key, nonce)
    cipher.setAAD(Buffer.from('suar-elasticsearch-cursor-v1', 'utf8'))
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(stored), 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return [
      'esc1',
      nonce.toString('base64url'),
      encrypted.toString('base64url'),
      tag.toString('base64url'),
    ].join('.')
  }

  decode(cursor: string, expected: ElasticsearchCursorIdentity): ElasticsearchCursorPayload {
    validateIdentity(expected)
    try {
      const [prefix, nonceSegment, encryptedSegment, tagSegment, extra] = cursor.split('.')
      if (
        prefix !== 'esc1' ||
        nonceSegment === undefined ||
        encryptedSegment === undefined ||
        tagSegment === undefined ||
        extra !== undefined
      ) {
        criteriaError()
      }
      const nonce = decodeCanonicalBase64Url(nonceSegment)
      const encrypted = decodeCanonicalBase64Url(encryptedSegment)
      const tag = decodeCanonicalBase64Url(tagSegment)
      if (nonce.length !== 12 || tag.length !== 16 || encrypted.length === 0) criteriaError()
      const decipher = createDecipheriv('aes-256-gcm', this.#key, nonce)
      decipher.setAAD(Buffer.from('suar-elasticsearch-cursor-v1', 'utf8'))
      decipher.setAuthTag(tag)
      const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
        'utf8'
      )
      const stored: unknown = JSON.parse(plaintext)
      validateStoredPayload(stored)
      const now = this.#clock().getTime()
      if (!Number.isFinite(now)) criteriaError()
      if (now > stored.expiresAt) cursorError('FILTER_CURSOR_EXPIRED')
      if (!sameIdentity(stored, expected)) {
        cursorError(
          hasStaleGenerationIdentity(stored, expected)
            ? 'FILTER_CURSOR_STALE'
            : 'FILTER_CURSOR_INVALID'
        )
      }
      const { version: _version, expiresAt: _expiresAt, ...payload } = stored
      return payload
    } catch (error) {
      if (error instanceof FilterExecutionError && error.code !== 'FILTER_CRITERIA_INVALID') {
        throw error
      }
      cursorError('FILTER_CURSOR_INVALID')
    }
  }
}

function hasStaleGenerationIdentity(
  payload: ElasticsearchCursorIdentity,
  expected: ElasticsearchCursorIdentity
): boolean {
  return (
    payload.schemaVersion !== expected.schemaVersion ||
    payload.rankingVersion !== expected.rankingVersion ||
    payload.indexGeneration !== expected.indexGeneration
  )
}

function validateStoredPayload(payload: unknown): asserts payload is StoredCursorPayload {
  if (
    !isRecord(payload) ||
    payload['version'] !== 1 ||
    !Number.isSafeInteger(payload['expiresAt'])
  ) {
    criteriaError()
  }
  validateIdentity(payload)
  validatePageState(payload)
}

function validateIdentity(identity: unknown): asserts identity is ElasticsearchCursorIdentity {
  if (
    !isRecord(identity) ||
    !nonEmpty(identity['context']) ||
    !Number.isSafeInteger(identity['schemaVersion']) ||
    Number(identity['schemaVersion']) < 1 ||
    !nonEmpty(identity['criteriaHash']) ||
    !nonEmpty(identity['authorizationHash']) ||
    !nonEmpty(identity['rankingVersion']) ||
    !nonEmpty(identity['indexGeneration']) ||
    !Array.isArray(identity['sort']) ||
    identity['sort'].length === 0 ||
    identity['sort'].some(
      (sort) =>
        !isRecord(sort) ||
        !nonEmpty(sort['field']) ||
        (sort['direction'] !== 'asc' && sort['direction'] !== 'desc')
    )
  ) {
    criteriaError()
  }
}

function validatePageState(payload: unknown): asserts payload is ElasticsearchCursorPayload {
  if (
    !isRecord(payload) ||
    !Array.isArray(payload['searchAfter']) ||
    payload['searchAfter'].length === 0 ||
    payload['searchAfter'].some(
      (value) =>
        value !== null &&
        typeof value !== 'string' &&
        typeof value !== 'number' &&
        typeof value !== 'boolean'
    ) ||
    !nonEmpty(payload['tieBreakId']) ||
    (payload['consumed'] !== undefined &&
      (!Number.isSafeInteger(payload['consumed']) || Number(payload['consumed']) < 1)) ||
    (payload['pitId'] !== undefined && !nonEmpty(payload['pitId']))
  ) {
    criteriaError()
  }
}

function sameIdentity(
  payload: ElasticsearchCursorIdentity,
  expected: ElasticsearchCursorIdentity
): boolean {
  return (
    payload.context === expected.context &&
    payload.schemaVersion === expected.schemaVersion &&
    payload.criteriaHash === expected.criteriaHash &&
    payload.authorizationHash === expected.authorizationHash &&
    payload.rankingVersion === expected.rankingVersion &&
    payload.indexGeneration === expected.indexGeneration &&
    JSON.stringify(payload.sort) === JSON.stringify(expected.sort)
  )
}

function decodeCanonicalBase64Url(segment: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) criteriaError()
  const decoded = Buffer.from(segment, 'base64url')
  if (decoded.toString('base64url') !== segment) criteriaError()
  return decoded
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function criteriaError(): never {
  throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
}

function cursorError(
  code: 'FILTER_CURSOR_INVALID' | 'FILTER_CURSOR_EXPIRED' | 'FILTER_CURSOR_STALE'
): never {
  throw new FilterExecutionError(code)
}
