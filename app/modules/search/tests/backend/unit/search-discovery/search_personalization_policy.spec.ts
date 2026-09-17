import { test } from '@japa/runner'

import {
  resolveSearchPersonalizationPolicy,
  type SearchPersonalizationPolicyInput,
} from '#modules/search/domain/search_personalization_policy'

const baseInput = (): SearchPersonalizationPolicyInput => ({
  consent: 'granted',
  provider: 'available',
  support: 10,
  minimumSupport: 3,
  currentOrganizationId: 'org-a',
  signals: [{ source: 'user_preference', feature: 'recent_interest', weight: 0.2, evidence: 'provider' }],
})

test.group('Unit | Search personalization policy', () => {
  test('uses bounded personalized signals only after consent, provider, and support gates pass', ({
    assert,
  }) => {
    const decision = resolveSearchPersonalizationPolicy(baseInput())

    assert.equal(decision.mode, 'personalized')
    assert.isFalse(decision.optOut)
    assert.deepEqual(decision.explanation, {
      mode: 'personalized',
      reason: 'personalized',
      optOut: false,
      scope: 'global',
      sources: ['user_preference'],
    })
  })

  test('falls back to global ranking and marks opt-out for denied or reset consent', ({ assert }) => {
    for (const consent of ['denied', 'reset'] as const) {
      const decision = resolveSearchPersonalizationPolicy({ ...baseInput(), consent })

      assert.equal(decision.mode, 'global')
      assert.isTrue(decision.optOut)
      assert.equal(decision.explanation.reason, consent === 'denied' ? 'opted_out' : 'reset')
      assert.deepEqual(decision.explanation.sources, [])
    }
  })

  test('fails closed to global ranking when consent, provider, or support is unavailable', ({
    assert,
  }) => {
    const cases = [
      { input: { ...baseInput(), consent: 'unknown' as const }, reason: 'consent_required' },
      { input: { ...baseInput(), provider: 'unavailable' as const }, reason: 'provider_unavailable' },
      { input: { ...baseInput(), support: 2 }, reason: 'insufficient_support' },
    ] as const

    for (const { input, reason } of cases) {
      const decision = resolveSearchPersonalizationPolicy(input)

      assert.equal(decision.mode, 'global')
      assert.isFalse(decision.optOut)
      assert.equal(decision.explanation.reason, reason)
      assert.deepEqual(decision.explanation.sources, [])
    }
  })

  test('rejects organization policy signals outside the server-derived organization scope', ({
    assert,
  }) => {
    const decision = resolveSearchPersonalizationPolicy({
      ...baseInput(),
      signals: [
        {
          source: 'organization_policy',
          organizationId: 'org-foreign',
          feature: 'preferred_alias',
          weight: 0.4,
          evidence: 'provider',
        },
      ],
    })

    assert.equal(decision.mode, 'global')
    assert.equal(decision.explanation.reason, 'organization_scope_mismatch')
    assert.equal(decision.explanation.scope, 'global')
    assert.deepEqual(decision.explanation.sources, [])
  })

  test('explains an authorized organization policy without exposing its organization identifier', ({
    assert,
  }) => {
    const decision = resolveSearchPersonalizationPolicy({
      ...baseInput(),
      signals: [
        {
          source: 'organization_policy',
          organizationId: 'org-a',
          feature: 'preferred_alias',
          weight: 0.4,
          evidence: 'provider',
        },
      ],
    })

    assert.equal(decision.mode, 'personalized')
    assert.deepEqual(decision.explanation, {
      mode: 'personalized',
      reason: 'personalized',
      optOut: false,
      scope: 'organization',
      sources: ['organization_policy'],
    })
    assert.notInclude(JSON.stringify(decision.explanation), 'org-a')
  })

  test('fails closed on malformed signals instead of emitting an unexplained personalized result', ({
    assert,
  }) => {
    const decision = resolveSearchPersonalizationPolicy({
      ...baseInput(),
      signals: [
        {
          source: 'untrusted_provider' as never,
          feature: '',
          weight: Number.NaN,
          evidence: 'untrusted' as never,
        },
      ],
    })

    assert.equal(decision.mode, 'global')
    assert.equal(decision.explanation.reason, 'invalid_signal')
    assert.deepEqual(decision.explanation.sources, [])
  })

  test('fails closed when the runtime signal collection is not an array', ({ assert }) => {
    const decision = resolveSearchPersonalizationPolicy({
      ...baseInput(),
      signals: null,
    })

    assert.equal(decision.mode, 'global')
    assert.equal(decision.explanation.reason, 'invalid_signal')
    assert.deepEqual(decision.explanation.sources, [])
  })
})
