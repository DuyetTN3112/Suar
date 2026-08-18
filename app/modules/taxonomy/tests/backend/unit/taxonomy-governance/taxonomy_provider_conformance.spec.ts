import { test } from '@japa/runner'

import {
  assertTaxonomyProviderConformance,
  createConformingTaxonomyFixture,
  type TaxonomyProviderConformanceFixture,
} from '../../contract/taxonomy-governance/taxonomy_provider_conformance.js'

async function expectConformanceFailure(
  run: () => Promise<unknown>,
  expectedMessage: string,
  assert: { include(haystack: string, needle: string): void }
): Promise<void> {
  try {
    await run()
    throw new Error('Expected malicious provider to fail conformance')
  } catch (error) {
    assert.include(String(error), expectedMessage)
  }
}

test.group('Taxonomy provider conformance', () => {
  for (const shape of ['flat', 'multi_parent'] as const) {
    test(`${shape} provider passes the shared permission-safe contract`, async ({ assert }) => {
      const fixture = createConformingTaxonomyFixture(shape)

      const report = await assertTaxonomyProviderConformance(fixture)

      assert.deepEqual(report, {
        shape,
        version: 7,
        authorizedTermCount: fixture.expectedAuthorizedTermCount,
        unauthorizedTermCount: fixture.expectedUnauthorizedTermCount,
        authorizedAssignmentCount: 2,
        unauthorizedAssignmentCount: 1,
      })
    })
  }

  test('rejects a provider that substitutes an authorized-looking term with the same count', async ({
    assert,
  }) => {
    const fixture = createConformingTaxonomyFixture('flat')
    const malicious: TaxonomyProviderConformanceFixture = {
      ...fixture,
      provider: {
        ...fixture.provider,
        async resolveTerms(refs, locale, context) {
          const resolved = await fixture.provider.resolveTerms(refs, locale, context)
          if (context === fixture.unauthorizedContext && refs.length === 2 && resolved[0]) {
            return [
              {
                ...resolved[0],
                ref: { namespace: 'skills', termId: 'substituted-public-term' },
              },
            ]
          }
          return resolved
        },
      },
    }

    await expectConformanceFailure(
      () => assertTaxonomyProviderConformance(malicious),
      'unauthorized term identities must match the fixture exactly',
      assert
    )
  })

  test('rejects suggested aliases leaking through option search', async ({ assert }) => {
    const fixture = createConformingTaxonomyFixture('flat')
    const malicious: TaxonomyProviderConformanceFixture = {
      ...fixture,
      provider: {
        ...fixture.provider,
        async searchTerms(input, context) {
          if (input.query === fixture.suggestedAlias) {
            const [term] = await fixture.provider.resolveTerms(
              [fixture.publicRef],
              input.locale,
              fixture.authorizedContext
            )
            return { items: term ? [term] : [], nextCursor: null }
          }
          return fixture.provider.searchTerms(input, context)
        },
      },
    }

    await expectConformanceFailure(
      () => assertTaxonomyProviderConformance(malicious),
      'suggested aliases must not enter option search',
      assert
    )
  })

  test('rejects same-count but incorrect ancestor paths', async ({ assert }) => {
    const fixture = createConformingTaxonomyFixture('flat')
    const malicious: TaxonomyProviderConformanceFixture = {
      ...fixture,
      provider: {
        ...fixture.provider,
        getAncestorPaths(refs, context) {
          if (
            context === fixture.authorizedContext &&
            refs[0]?.termId === fixture.publicRef.termId
          ) {
            return Promise.resolve([
              [fixture.publicRef, { namespace: 'skills', termId: 'wrong-root' }],
            ])
          }
          return fixture.provider.getAncestorPaths(refs, context)
        },
      },
    }

    await expectConformanceFailure(
      () => assertTaxonomyProviderConformance(malicious),
      'ancestor paths must match the fixture exactly',
      assert
    )
  })

  test('rejects count-correct assignments with wrong identities or leaking side channels', async ({
    assert,
  }) => {
    const fixture = createConformingTaxonomyFixture('flat')
    const malicious: TaxonomyProviderConformanceFixture = {
      ...fixture,
      assignmentProvider: {
        async getAssignments(query, context) {
          const result = await fixture.assignmentProvider.getAssignments(query, context)
          if (context === fixture.unauthorizedContext && result.assignments[0]) {
            return {
              ...result,
              assignments: [
                {
                  ...result.assignments[0],
                  entityId: 'wrong-entity',
                },
              ],
              diagnostics: [
                {
                  code: 'missing_label',
                  severity: 'warning',
                  path: 'secret-platform',
                  message: 'hidden term exists',
                },
              ],
            }
          }
          return result
        },
      },
    }

    await expectConformanceFailure(
      () => assertTaxonomyProviderConformance(malicious),
      'unauthorized assignment payload must match the fixture exactly',
      assert
    )
  })

  test('rejects providers that ignore resource, entity, or namespace scope', async ({ assert }) => {
    const fixture = createConformingTaxonomyFixture('flat')
    const malicious: TaxonomyProviderConformanceFixture = {
      ...fixture,
      assignmentProvider: {
        getAssignments(query, context) {
          const ignoresScope =
            query.resource === 'project' ||
            query.entityIds.includes('wrong-entity') ||
            query.namespaces?.includes('wrong-namespace') === true
          return fixture.assignmentProvider.getAssignments(
            ignoresScope ? fixture.assignmentQuery : query,
            context
          )
        },
      },
    }

    await expectConformanceFailure(
      () => assertTaxonomyProviderConformance(malicious),
      'out-of-scope assignment queries must return the safe empty payload',
      assert
    )
  })
})
