import { test } from '@japa/runner'

import {
  resolveSearchPersonalizationPolicy,
  type SearchPersonalizationPolicyInput,
} from '#modules/search/domain/search_personalization_policy'

const input = (overrides: Partial<SearchPersonalizationPolicyInput> = {}): SearchPersonalizationPolicyInput => ({
  consent: 'granted',
  provider: 'available',
  support: 10,
  minimumSupport: 3,
  currentOrganizationId: 'org-a',
  signals: [{ source: 'user_preference', feature: 'recent_interest', weight: 0.2, evidence: 'provider' }],
  ...overrides,
})

test.group('Contract | Search personalization policy', () => {
  test('keeps every unsafe adaptive state on the explainable global fallback contract', ({ assert }) => {
    const decisions = [
      resolveSearchPersonalizationPolicy(input({ consent: 'unknown' })),
      resolveSearchPersonalizationPolicy(input({ consent: 'denied' })),
      resolveSearchPersonalizationPolicy(input({ consent: 'reset' })),
      resolveSearchPersonalizationPolicy(input({ provider: 'unavailable' })),
      resolveSearchPersonalizationPolicy(input({ support: 0 })),
      resolveSearchPersonalizationPolicy(input({ currentOrganizationId: null, signals: [{
        source: 'organization_policy',
        organizationId: 'org-a',
        feature: 'private_alias',
        weight: 0.2,
        evidence: 'provider',
      }] })),
    ]

    for (const decision of decisions) {
      assert.equal(decision.mode, 'global')
      assert.equal(decision.explanation.mode, 'global')
      assert.deepEqual(decision.explanation.sources, [])
      assert.isTrue(['consent_required', 'opted_out', 'reset', 'provider_unavailable', 'insufficient_support', 'organization_scope_mismatch'].includes(decision.explanation.reason))
    }
  })

  test('keeps the authorized contract limited to declared source classes and bounded scope', ({ assert }) => {
    const decision = resolveSearchPersonalizationPolicy(input({
      signals: [
        { source: 'user_preference', feature: 'recent_interest', weight: 0.2, evidence: 'provider' },
        { source: 'organization_policy', organizationId: 'org-a', feature: 'reviewed_alias', weight: 0.3, evidence: 'provider' },
      ],
    }))

    assert.deepEqual(decision, {
      mode: 'personalized',
      optOut: false,
      explanation: {
        mode: 'personalized',
        reason: 'personalized',
        optOut: false,
        scope: 'mixed',
        sources: ['user_preference', 'organization_policy'],
      },
    })
  })
})
