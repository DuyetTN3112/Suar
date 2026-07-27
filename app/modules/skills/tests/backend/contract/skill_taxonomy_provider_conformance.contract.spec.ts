import { test } from '@japa/runner'

import type { SkillTaxonomyCatalogReader } from '#modules/skills/actions/ports/outbound/skill_taxonomy_catalog_reader'
import { SkillTaxonomyProvider } from '#modules/skills/infra/adapters/skill-catalog/skill_taxonomy_provider'
import {
  assertTaxonomyProviderConformance,
  createConformingTaxonomyFixture,
} from '#modules/taxonomy/tests/backend/contract/taxonomy-governance/taxonomy_provider_conformance'

test.group('Contract | Skill taxonomy provider conformance', () => {
  for (const shape of ['flat', 'multi_parent'] as const) {
    test(`satisfies the shared WP-02 ${shape} contract`, async ({ assert }) => {
      const fixture = createConformingTaxonomyFixture(shape)
      const hiddenKey = `${fixture.hiddenRef.namespace}:${fixture.hiddenRef.termId}`
      const allRefs = [
        fixture.publicRef,
        fixture.hiddenRef,
        fixture.retiredRef,
        ...fixture.expectedAmbiguousAliasRefs,
        ...fixture.expectedAncestorPaths.flat(),
      ]
      const uniqueRefs = [
        ...new Map(
          allRefs.map((termRef) => [`${termRef.namespace}:${termRef.termId}`, termRef])
        ).values(),
      ]
      const resolved = await fixture.provider.resolveTerms(
        uniqueRefs,
        'en',
        fixture.authorizedContext
      )
      const reader: SkillTaxonomyCatalogReader = {
        loadSnapshot: () =>
          Promise.resolve({
            version: fixture.expectedVersion,
            organizationVocabulary: 'supported',
            terms: resolved.map((term) => ({
              term,
              visibility:
                `${term.ref.namespace}:${term.ref.termId}` === hiddenKey
                  ? { kind: 'organization' as const, organizationId: 'org-secret' }
                  : { kind: 'public' as const },
            })),
          }),
      }

      fixture.provider = new SkillTaxonomyProvider(reader, {
        cursorSigningKey: 'test-only-skill-taxonomy-conformance-cursor-signing-key-v1',
      })
      fixture.authorizedContext = {
        authorizationToken: 'allow-hidden',
        attributes: { organizationId: 'org-secret' },
      }
      fixture.unauthorizedContext = {
        authorizationToken: 'public-only',
        attributes: { organizationId: 'org-public' },
      }

      const report = await assertTaxonomyProviderConformance(fixture)

      assert.equal(report.version, fixture.expectedVersion)
      assert.equal(report.shape, shape)
    })
  }
})
