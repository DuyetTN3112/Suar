import type {
  FilterCondition,
  FilterExpression,
  FilterUrlExposurePolicy,
  FilterUrlState,
} from './contracts'
import {
  canonicalizeFilterUrlState,
  isFilterUrlState,
  stableCriteriaJson,
} from './criteria_codec'
import { filterFrontendDiagnostic, type FilterFrontendDiagnostic } from './filter_diagnostics'

interface FilterUrlEnvelope {
  version: 1
  state: FilterUrlState
}

const ENVELOPE_SEPARATOR = '.'

export type FilterUrlEncodeResult =
  | { ok: true; value: string }
  | { ok: false; diagnostic: FilterFrontendDiagnostic }

export type FilterUrlDecodeResult =
  | { status: 'ready'; state: FilterUrlState; diagnostics: [] }
  | {
      status: 'repair'
      diagnostics: FilterFrontendDiagnostic[]
      preservedPayload: string
    }

export interface FilterUrlEncodeOptions {
  maxEncodedLength: number
  exposurePolicy: FilterUrlExposurePolicy
}

export interface FilterUrlDecodeOptions {
  maxEncodedLength: number
  supportedSchemaVersions: readonly number[]
  exposurePolicy: FilterUrlExposurePolicy
}

function visitConditions(
  expression: FilterExpression | undefined,
  visit: (condition: FilterCondition) => boolean,
  depth = 0,
  seen = new WeakSet<object>()
): boolean {
  if (expression === undefined) return true
  if (depth > 20 || seen.has(expression)) return false
  seen.add(expression)
  if (expression.kind === 'condition') {
    if (!visit(expression)) return false
    return expression.value?.kind !== 'relation'
      ? true
      : visitConditions(expression.value.expression, visit, depth + 1, seen)
  }
  return expression.children.every((child) => visitConditions(child, visit, depth + 1, seen))
}

function isUrlSafe(state: FilterUrlState, policy: FilterUrlExposurePolicy): boolean {
  if (!policy.canExposeContext(state.criteria.context)) return false
  if (
    !visitConditions(state.criteria.filter, (condition) => policy.canExposeCondition(condition))
  ) {
    return false
  }
  if (
    !(state.criteria.preferences ?? []).every((preference) =>
      visitConditions(preference.expression, (condition) => policy.canExposeCondition(condition))
    )
  ) {
    return false
  }
  if (state.criteria.text !== undefined && !policy.canExposeText(state.criteria.text.value)) {
    return false
  }
  if (
    !state.criteria.sort.every(({ field }) => policy.canExposeFieldReference(field, 'sort')) ||
    !(state.criteria.projection ?? []).every((field) =>
      policy.canExposeFieldReference(field, 'projection')
    ) ||
    !(state.criteria.requestedFacets ?? []).every(({ field }) =>
      policy.canExposeFieldReference(field, 'facet')
    )
  ) {
    return false
  }
  if (
    state.criteria.page.cursor !== undefined &&
    !policy.canExposeCursor(state.criteria.page.cursor, 'page')
  ) {
    return false
  }
  return Object.entries(state.presentation).every(([key, value]) =>
    policy.canExposePresentationEntry(key, value)
  )
}

function encodeUtf8Base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

function decodeUtf8Base64Url(value: string): string {
  if (!/^[A-Za-z0-9_-]+$/u.test(value) || value.length % 4 === 1) {
    throw new TypeError('Invalid base64url')
  }
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedKeys = new Set(allowed)
  return Object.keys(value).every((key) => allowedKeys.has(key))
}

export function encodeFilterUrlState(
  state: FilterUrlState,
  options: FilterUrlEncodeOptions
): FilterUrlEncodeResult {
  let stateValid = false
  let urlSafe = false
  let canonicalState: FilterUrlState | undefined
  try {
    stateValid = isFilterUrlState(state)
    if (stateValid) {
      canonicalState = canonicalizeFilterUrlState(state)
      urlSafe = isUrlSafe(canonicalState, options.exposurePolicy)
    }
  } catch {
    stateValid = false
  }
  if (!stateValid) {
    return {
      ok: false,
      diagnostic: filterFrontendDiagnostic(
        'FILTER_URL_STATE_INVALID',
        [],
        'The criteria contain malformed or unsupported URL state.',
        'Repair the preserved state before sharing or executing it.'
      ),
    }
  }
  if (!urlSafe) {
    return {
      ok: false,
      diagnostic: filterFrontendDiagnostic(
        'FILTER_URL_SENSITIVE_CRITERIA',
        ['criteria'],
        'One or more criteria are not approved for browser history.',
        'Save this filter privately or remove the sensitive condition before sharing.'
      ),
    }
  }
  let encoded: string
  try {
    if (canonicalState === undefined) throw new TypeError('Missing canonical state')
    const envelope: FilterUrlEnvelope = { version: 1, state: canonicalState }
    const body = encodeUtf8Base64Url(stableCriteriaJson(envelope))
    encoded = `${body.length.toString(36)}${ENVELOPE_SEPARATOR}${body}`
  } catch {
    return {
      ok: false,
      diagnostic: filterFrontendDiagnostic(
        'FILTER_URL_STATE_INVALID',
        [],
        'The criteria could not be canonicalized into a safe URL state.',
        'Repair the malformed condition before sharing or executing it.'
      ),
    }
  }
  if (encoded.length > options.maxEncodedLength) {
    return {
      ok: false,
      diagnostic: filterFrontendDiagnostic(
        'FILTER_URL_TOO_LARGE',
        [],
        'The canonical criteria exceed the configured URL limit.',
        'Save the filter as a view; the expression was not truncated.'
      ),
    }
  }
  return { ok: true, value: encoded }
}

export function decodeFilterUrlState(
  value: string,
  options: FilterUrlDecodeOptions
): FilterUrlDecodeResult {
  if (value.length > options.maxEncodedLength) {
    return {
      status: 'repair',
      diagnostics: [
        filterFrontendDiagnostic(
          'FILTER_URL_TOO_LARGE',
          [],
          'The encoded criteria exceed the configured URL limit.',
          'Open a trusted saved view instead; oversized URL state is not executed.'
        ),
      ],
      preservedPayload: value,
    }
  }

  const separatorIndex = value.indexOf(ENVELOPE_SEPARATOR)
  const declaredLengthText = value.slice(0, separatorIndex)
  const body = separatorIndex < 0 ? '' : value.slice(separatorIndex + 1)
  const declaredLength = /^[0-9a-z]+$/u.test(declaredLengthText)
    ? Number.parseInt(declaredLengthText, 36)
    : Number.NaN
  if (
    !Number.isSafeInteger(declaredLength) ||
    declaredLength < 1 ||
    body.length !== declaredLength
  ) {
    const truncated = Number.isSafeInteger(declaredLength) && body.length < declaredLength
    return {
      status: 'repair',
      diagnostics: [
        filterFrontendDiagnostic(
          truncated ? 'FILTER_URL_TRUNCATED' : 'FILTER_URL_MALFORMED',
          [],
          'The URL criteria envelope is incomplete or malformed.',
          'Repair or clear the encoded criteria; no partial expression was executed.'
        ),
      ],
      preservedPayload: value,
    }
  }

  let payload: unknown
  try {
    payload = JSON.parse(decodeUtf8Base64Url(body))
  } catch {
    return {
      status: 'repair',
      diagnostics: [
        filterFrontendDiagnostic(
          'FILTER_URL_MALFORMED',
          [],
          'The URL criteria could not be decoded safely.',
          'Repair or clear the encoded criteria; no partial expression was executed.'
        ),
      ],
      preservedPayload: value,
    }
  }

  if (
    !isRecord(payload) ||
    !hasOnlyKeys(payload, ['version', 'state']) ||
    payload['version'] !== 1 ||
    !('state' in payload)
  ) {
    return {
      status: 'repair',
      diagnostics: [
        filterFrontendDiagnostic(
          'FILTER_URL_STATE_INVALID',
          [],
          'The URL envelope version or shape is unsupported.',
          'Use a current link or repair the preserved payload.'
        ),
      ],
      preservedPayload: value,
    }
  }

  const state = payload['state']
  if (
    isRecord(state) &&
    isRecord(state['criteria']) &&
    Number.isSafeInteger(state['criteria']['schemaVersion']) &&
    !options.supportedSchemaVersions.includes(Number(state['criteria']['schemaVersion']))
  ) {
    return {
      status: 'repair',
      diagnostics: [
        filterFrontendDiagnostic(
          'FILTER_URL_SCHEMA_UNSUPPORTED',
          ['criteria', 'schemaVersion'],
          'The criteria use a schema version this client cannot execute.',
          'Preserve the payload and run the registered migration or repair flow.'
        ),
      ],
      preservedPayload: value,
    }
  }

  if (!isFilterUrlState(state)) {
    return {
      status: 'repair',
      diagnostics: [
        filterFrontendDiagnostic(
          'FILTER_URL_STATE_INVALID',
          [],
          'The URL state contains an unsupported or malformed condition.',
          'Inspect the preserved payload and repair unsupported clauses explicitly.'
        ),
      ],
      preservedPayload: value,
    }
  }
  const canonicalState = canonicalizeFilterUrlState(state)
  let urlSafe = false
  try {
    urlSafe = isUrlSafe(canonicalState, options.exposurePolicy)
  } catch {
    urlSafe = false
  }
  if (!urlSafe) {
    return {
      status: 'repair',
      diagnostics: [
        filterFrontendDiagnostic(
          'FILTER_URL_SENSITIVE_CRITERIA',
          ['criteria'],
          'The URL state is not approved for this browser context.',
          'Keep the payload preserved and remove or privately save sensitive criteria.'
        ),
      ],
      preservedPayload: value,
    }
  }
  return { status: 'ready', state: canonicalState, diagnostics: [] }
}
