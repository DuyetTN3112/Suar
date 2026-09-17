import { Buffer } from 'node:buffer'
import { createHmac, timingSafeEqual } from 'node:crypto'

import type {
  TaxonomyAccessContext,
  TaxonomyTermSearchInput,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_provider'
import { TaxonomyCursorError } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_provider'

interface CursorPayload {
  readonly format: 1
  readonly offset: number
  readonly scope: string
  readonly version: number
}

const MAX_CURSOR_SIZE = 1_024
export const MIN_CURSOR_SIGNING_KEY_LENGTH = 32

function canonicalJson(
  value: unknown,
  visiting = new WeakSet<object>(),
  depth = 0,
  budget: { nodes: number } = { nodes: 0 }
): string {
  if (depth > 20) throw new TaxonomyCursorError('invalid')
  budget.nodes += 1
  if (budget.nodes > 1_000) throw new TaxonomyCursorError('invalid')
  if (value === null) return 'null'
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TaxonomyCursorError('invalid')
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    if (visiting.has(value)) throw new TaxonomyCursorError('invalid')
    visiting.add(value)
    const serialized = `[${value
      .map((item) => canonicalJson(item, visiting, depth + 1, budget))
      .join(',')}]`
    visiting.delete(value)
    return serialized
  }
  if (typeof value === 'object') {
    if (visiting.has(value)) throw new TaxonomyCursorError('invalid')
    const prototype = Reflect.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TaxonomyCursorError('invalid')
    }
    visiting.add(value)
    const serialized = `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, item]) =>
          `${JSON.stringify(key)}:${canonicalJson(item, visiting, depth + 1, budget)}`
      )
      .join(',')}}`
    visiting.delete(value)
    return serialized
  }
  throw new TaxonomyCursorError('invalid')
}

function hmac(value: string, signingKey: string): string {
  return createHmac('sha256', signingKey).update(value, 'utf8').digest('base64url')
}

function isCursorPayload(value: unknown): value is CursorPayload {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  return (
    Object.keys(candidate).sort().join(',') === 'format,offset,scope,version' &&
    candidate['format'] === 1 &&
    Number.isSafeInteger(candidate['offset']) &&
    Number(candidate['offset']) >= 0 &&
    typeof candidate['scope'] === 'string' &&
    /^[A-Za-z0-9_-]{43}$/u.test(candidate['scope']) &&
    Number.isSafeInteger(candidate['version']) &&
    Number(candidate['version']) >= 1
  )
}

export class SkillTaxonomyCursorVerifier {
  readonly #signingKey: string

  constructor(signingKey: string) {
    if (signingKey.length < MIN_CURSOR_SIGNING_KEY_LENGTH) {
      throw new TypeError('Skill taxonomy cursor signing key must contain at least 32 characters')
    }
    this.#signingKey = signingKey
  }

  computeScope(
    input: TaxonomyTermSearchInput,
    context: TaxonomyAccessContext | undefined,
    normalizedLocale: string,
    normalizedQuery: string
  ): string {
    return hmac(
      canonicalJson({
        access: {
          attributes: context?.attributes ?? {},
          authorizationToken: context?.authorizationToken ?? null,
        },
        includeInactive: input.includeInactive === true,
        locale: normalizedLocale,
        query: normalizedQuery,
      }),
      this.#signingKey
    )
  }

  encodeCursor(offset: number, version: number, scope: string): string {
    const payload: CursorPayload = { format: 1, offset, scope, version }
    const body = Buffer.from(canonicalJson(payload), 'utf8').toString('base64url')
    return `${body}.${hmac(body, this.#signingKey)}`
  }

  decodeCursor(
    cursor: string | undefined,
    expectedVersion: number,
    expectedScope: string
  ): number {
    if (cursor === undefined) return 0
    if (cursor.length === 0 || cursor.length > MAX_CURSOR_SIZE) {
      throw new TaxonomyCursorError('invalid')
    }
    const [body, signature, extra] = cursor.split('.')
    if (
      !body ||
      !signature ||
      extra !== undefined ||
      !/^[A-Za-z0-9_-]+$/u.test(body) ||
      !/^[A-Za-z0-9_-]{43}$/u.test(signature)
    ) {
      throw new TaxonomyCursorError('invalid')
    }
    const expectedSignature = hmac(body, this.#signingKey)
    const actualBytes = Buffer.from(signature, 'utf8')
    const expectedBytes = Buffer.from(expectedSignature, 'utf8')
    if (
      actualBytes.length !== expectedBytes.length ||
      !timingSafeEqual(actualBytes, expectedBytes)
    ) {
      throw new TaxonomyCursorError('invalid')
    }
    try {
      const payload: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
      if (!isCursorPayload(payload)) throw new TaxonomyCursorError('invalid')
      if (payload.version !== expectedVersion) throw new TaxonomyCursorError('stale')
      if (payload.scope !== expectedScope) throw new TaxonomyCursorError('invalid')
      return payload.offset
    } catch (error) {
      if (error instanceof TaxonomyCursorError) throw error
      throw new TaxonomyCursorError('invalid')
    }
  }
}
