import { describe, expect, it } from 'vitest'

import type { FilterUrlState } from '../contracts'
import { decodeFilterUrlState, encodeFilterUrlState } from '../filter_url_codec'

const baseState: FilterUrlState = {
  criteria: {
    context: 'marketplace.tasks',
    schemaVersion: 1,
    filter: {
      kind: 'condition',
      field: 'skills',
      operator: 'contains_any',
      effect: 'require',
      unknown: 'exclude',
      value: { kind: 'set', values: ['Vue', 'TypeScript', 'vue'] },
    },
    sort: [{ field: 'relevance', direction: 'desc' }],
    page: { size: 20, cursor: 'must-reset-on-change' },
  },
  presentation: { view: 'grid', density: 'comfortable', expandedFacetKeys: ['skills'] },
}

const publicExposure = {
  canExposeContext: () => true,
  canExposeFieldReference: () => true,
  canExposeCondition: () => true,
  canExposeText: () => true,
  canExposeCursor: () => true,
  canExposePresentationEntry: () => true,
}

function encodeRawEnvelope(envelope: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(envelope))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const body = btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
  return `${body.length.toString(36)}.${body}`
}

describe('filter URL codec', () => {
  it('produces a stable canonical value independent of harmless set order and casing', () => {
    const reordered: FilterUrlState = {
      ...baseState,
      criteria: {
        ...baseState.criteria,
        filter: {
          kind: 'condition',
          field: 'skills',
          operator: 'contains_any',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'set', values: ['typescript', 'VUE'] },
        },
      },
    }

    const first = encodeFilterUrlState(baseState, {
      maxEncodedLength: 4_096,
      exposurePolicy: publicExposure,
    })
    const second = encodeFilterUrlState(reordered, {
      maxEncodedLength: 4_096,
      exposurePolicy: publicExposure,
    })

    expect(first).toEqual(second)
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const decoded = decodeFilterUrlState(first.value, {
      supportedSchemaVersions: [1],
      maxEncodedLength: 4_096,
      exposurePolicy: publicExposure,
    })
    expect(decoded.status).toBe('ready')
    if (decoded.status !== 'ready') return
    expect(decoded.state.criteria.filter).toEqual({
      kind: 'condition',
      field: 'skills',
      operator: 'contains_any',
      effect: 'require',
      unknown: 'exclude',
      value: { kind: 'set', values: ['typescript', 'vue'] },
    })
  })

  it('round-trips Vietnamese, emoji, and RTL text without using localized labels as identity', () => {
    const unicodeState: FilterUrlState = {
      ...baseState,
      criteria: {
        ...baseState.criteria,
        text: { value: 'Tìm kỹ năng 🧭 مرحبا' },
        filter: {
          kind: 'condition',
          field: 'topics',
          operator: 'contains_any',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'set', values: ['Điện Ảnh', 'ĐIỆN ẢNH', 'قصص'] },
        },
      },
    }
    const encoded = encodeFilterUrlState(unicodeState, {
      maxEncodedLength: 4_096,
      exposurePolicy: { ...publicExposure, canExposeText: () => true },
    })
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) return

    const decoded = decodeFilterUrlState(encoded.value, {
      supportedSchemaVersions: [1],
      maxEncodedLength: 4_096,
      exposurePolicy: publicExposure,
    })
    expect(decoded.status).toBe('ready')
    if (decoded.status !== 'ready') return
    expect(decoded.state.criteria.text?.value).toBe('Tìm kỹ năng 🧭 مرحبا')
    expect(decoded.state.criteria.filter).toMatchObject({
      field: 'topics',
      value: { values: ['điện ảnh', 'قصص'] },
    })
  })

  it('does not persist transient facet-value search text or facet cursors in URL identity', () => {
    const withTransientFacetState: FilterUrlState = {
      ...baseState,
      criteria: {
        ...baseState.criteria,
        requestedFacets: [
          {
            field: 'skills',
            countMode: 'self_excluding',
            valueSearch: 'Nhãn tạm thời',
            cursor: 'private-facet-cursor',
          },
        ],
      },
    }
    const stableFacetState: FilterUrlState = {
      ...baseState,
      criteria: {
        ...baseState.criteria,
        requestedFacets: [{ field: 'skills', countMode: 'self_excluding' }],
      },
    }

    expect(
      encodeFilterUrlState(withTransientFacetState, {
        maxEncodedLength: 4_096,
        exposurePolicy: publicExposure,
      })
    ).toEqual(
      encodeFilterUrlState(stableFacetState, {
        maxEncodedLength: 4_096,
        exposurePolicy: publicExposure,
      })
    )
  })

  it.each(['%', 'abc', 'eyJ2IjoxLCJzdGF0ZSI6'])(
    'fails closed for malformed/truncated value %s',
    (value) => {
      const decoded = decodeFilterUrlState(value, {
        supportedSchemaVersions: [1],
        maxEncodedLength: 4_096,
        exposurePolicy: publicExposure,
      })

      expect(decoded.status).toBe('repair')
      expect(decoded.diagnostics[0]?.code).toMatch(/MALFORMED|TRUNCATED/)
    }
  )

  it('preserves unsupported schema payload for explicit repair without executing it', () => {
    const encoded = encodeFilterUrlState(
      { ...baseState, criteria: { ...baseState.criteria, schemaVersion: 77 } },
      { maxEncodedLength: 4_096, exposurePolicy: publicExposure }
    )
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) return

    const decoded = decodeFilterUrlState(encoded.value, {
      supportedSchemaVersions: [1],
      maxEncodedLength: 4_096,
      exposurePolicy: publicExposure,
    })
    expect(decoded.status).toBe('repair')
    if (decoded.status !== 'repair') return
    expect(decoded.preservedPayload).toBe(encoded.value)
    expect(decoded.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'FILTER_URL_SCHEMA_UNSUPPORTED',
        path: ['criteria', 'schemaVersion'],
      })
    )
  })

  it('preserves a future condition shape for repair instead of partially executing it', () => {
    const futureEnvelope = {
      version: 1,
      state: {
        ...baseState,
        criteria: {
          ...baseState.criteria,
          filter: { kind: 'future_semantic_clause', payload: 'keep-me' },
        },
      },
    }
    const tampered = encodeRawEnvelope(futureEnvelope)

    const result = decodeFilterUrlState(tampered, {
      supportedSchemaVersions: [1],
      maxEncodedLength: 4_096,
      exposurePolicy: publicExposure,
    })
    expect(result.status).toBe('repair')
    if (result.status !== 'repair') return
    expect(result.preservedPayload).toBe(tampered)
    expect(result.diagnostics[0]?.code).toBe('FILTER_URL_STATE_INVALID')
  })

  it('rejects extra envelope keys and never exposes their decoded values to repair state', () => {
    const encoded = encodeRawEnvelope({
      version: 1,
      state: baseState,
      secret: 'cross-tenant-compensation-band',
    })

    const decoded = decodeFilterUrlState(encoded, {
      supportedSchemaVersions: [1],
      maxEncodedLength: 4_096,
      exposurePolicy: publicExposure,
    })

    expect(decoded.status).toBe('repair')
    if (decoded.status !== 'repair') return
    expect(decoded.diagnostics[0]?.code).toBe('FILTER_URL_STATE_INVALID')
    expect(decoded.preservedPayload).toBe(encoded)
    expect(typeof decoded.preservedPayload).toBe('string')
  })

  it('keeps unsupported or sensitive decoded state opaque until an authorized repair flow opens it', () => {
    const unsupportedSchema = encodeRawEnvelope({
      version: 1,
      state: {
        ...baseState,
        criteria: {
          ...baseState.criteria,
          schemaVersion: 77,
          filter: {
            kind: 'future_semantic_clause',
            privateValue: 'restricted-acquisition-target',
          },
        },
      },
    })
    const validButSensitive = encodeFilterUrlState(baseState, {
      maxEncodedLength: 4_096,
      exposurePolicy: publicExposure,
    })
    expect(validButSensitive.ok).toBe(true)
    if (!validButSensitive.ok) return

    const denyEveryCondition = {
      ...publicExposure,
      canExposeCondition: () => false,
    }
    const unsupportedResult = decodeFilterUrlState(unsupportedSchema, {
      supportedSchemaVersions: [1],
      maxEncodedLength: 4_096,
      exposurePolicy: denyEveryCondition,
    })
    const sensitiveResult = decodeFilterUrlState(validButSensitive.value, {
      supportedSchemaVersions: [1],
      maxEncodedLength: 4_096,
      exposurePolicy: denyEveryCondition,
    })

    expect(unsupportedResult.status).toBe('repair')
    expect(sensitiveResult.status).toBe('repair')
    if (unsupportedResult.status === 'repair') {
      expect(unsupportedResult.preservedPayload).toBe(unsupportedSchema)
      expect(typeof unsupportedResult.preservedPayload).toBe('string')
    }
    if (sensitiveResult.status === 'repair') {
      expect(sensitiveResult.preservedPayload).toBe(validButSensitive.value)
      expect(typeof sensitiveResult.preservedPayload).toBe('string')
    }
  })

  it('distinguishes a length-proven truncated envelope from malformed input', () => {
    const encoded = encodeFilterUrlState(baseState, {
      maxEncodedLength: 4_096,
      exposurePolicy: publicExposure,
    })
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) return

    const decoded = decodeFilterUrlState(encoded.value.slice(0, -1), {
      supportedSchemaVersions: [1],
      maxEncodedLength: 4_096,
      exposurePolicy: publicExposure,
    })
    expect(decoded.status).toBe('repair')
    expect(decoded.diagnostics[0]?.code).toBe('FILTER_URL_TRUNCATED')
  })

  it('never truncates an oversized AST and blocks sensitive criteria without an explicit policy grant', () => {
    const oversized = encodeFilterUrlState(baseState, {
      maxEncodedLength: 12,
      exposurePolicy: publicExposure,
    })
    expect(oversized.ok).toBe(false)
    if (oversized.ok) return
    expect(oversized.diagnostic.code).toBe('FILTER_URL_TOO_LARGE')

    const sensitive = encodeFilterUrlState(baseState, {
      maxEncodedLength: 4_096,
      exposurePolicy: {
        ...publicExposure,
        canExposeCondition: ({ field }) => field !== 'skills',
      },
    })
    expect(sensitive.ok).toBe(false)
    if (sensitive.ok) return
    expect(sensitive.diagnostic.code).toBe('FILTER_URL_SENSITIVE_CRITERIA')

    const sensitiveText = encodeFilterUrlState(
      { ...baseState, criteria: { ...baseState.criteria, text: { value: 'private acquisition' } } },
      {
        maxEncodedLength: 4_096,
        exposurePolicy: { ...publicExposure, canExposeText: () => false },
      }
    )
    expect(sensitiveText.ok).toBe(false)
    if (!sensitiveText.ok) {
      expect(sensitiveText.diagnostic.code).toBe('FILTER_URL_SENSITIVE_CRITERIA')
    }
  })

  it('enforces exposure policy on nested relations, presentation, and externally crafted URLs', () => {
    const nestedSensitive: FilterUrlState = {
      ...baseState,
      criteria: {
        ...baseState.criteria,
        filter: {
          kind: 'condition',
          field: 'applications',
          operator: 'related_matches',
          effect: 'require',
          unknown: 'exclude',
          value: {
            kind: 'relation',
            expression: {
              kind: 'condition',
              field: 'private_compensation',
              operator: 'eq',
              effect: 'require',
              unknown: 'exclude',
              value: { kind: 'scalar', value: 'secret-band' },
            },
          },
        },
      },
    }
    const nestedPolicy = {
      ...publicExposure,
      canExposeCondition: ({ field }: { field: string }) => field !== 'private_compensation',
    }
    const nested = encodeFilterUrlState(nestedSensitive, {
      maxEncodedLength: 4_096,
      exposurePolicy: nestedPolicy,
    })
    expect(nested.ok).toBe(false)
    if (!nested.ok) expect(nested.diagnostic.code).toBe('FILTER_URL_SENSITIVE_CRITERIA')

    const externallyEncoded = encodeFilterUrlState(nestedSensitive, {
      maxEncodedLength: 4_096,
      exposurePolicy: publicExposure,
    })
    expect(externallyEncoded.ok).toBe(true)
    if (!externallyEncoded.ok) return
    const decoded = decodeFilterUrlState(externallyEncoded.value, {
      supportedSchemaVersions: [1],
      maxEncodedLength: 4_096,
      exposurePolicy: nestedPolicy,
    })
    expect(decoded.status).toBe('repair')
    if (decoded.status === 'repair') {
      expect(decoded.diagnostics[0]?.code).toBe('FILTER_URL_SENSITIVE_CRITERIA')
    }

    const presentationLeak = encodeFilterUrlState(baseState, {
      maxEncodedLength: 4_096,
      exposurePolicy: {
        ...publicExposure,
        canExposePresentationEntry: (key) => key !== 'expandedFacetKeys',
      },
    })
    expect(presentationLeak.ok).toBe(false)
  })
})
