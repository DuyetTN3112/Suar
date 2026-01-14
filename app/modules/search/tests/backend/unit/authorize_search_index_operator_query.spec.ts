import { test } from '@japa/runner'

import { AuthorizeSearchIndexOperatorQuery } from '#modules/search/actions/queries/authorize_search_index_operator_query'

const configuredPrincipalId = '019fa98a-927e-7cdf-86a3-03dbf6caa185'

test.group('AuthorizeSearchIndexOperatorQuery', () => {
  test('returns the active configured principal when permission is proven', async ({
    assert,
  }) => {
    const query = new AuthorizeSearchIndexOperatorQuery(
      {
        findPrincipal: (actorId) =>
          Promise.resolve({
            id: actorId,
            systemRole: 'superadmin',
            status: 'active',
          }),
      },
      {
        hasPermission: () => Promise.resolve(true),
      },
      configuredPrincipalId
    )

    const result = await query.handle({ assertedActorId: configuredPrincipalId })

    assert.deepEqual(result, {
      id: configuredPrincipalId,
      systemRole: 'superadmin',
      actorType: 'service',
      authenticationProvenance: 'runtime_environment',
    })
  })

  test('fails closed for mismatched, inactive, or unauthorized principals', async ({
    assert,
  }) => {
    const inactiveQuery = new AuthorizeSearchIndexOperatorQuery(
      {
        findPrincipal: (actorId) =>
          Promise.resolve({
            id: actorId,
            systemRole: 'superadmin',
            status: 'inactive',
          }),
      },
      {
        hasPermission: () => Promise.resolve(true),
      },
      configuredPrincipalId
    )
    const unauthorizedQuery = new AuthorizeSearchIndexOperatorQuery(
      {
        findPrincipal: (actorId) =>
          Promise.resolve({
            id: actorId,
            systemRole: 'superadmin',
            status: 'active',
          }),
      },
      {
        hasPermission: () => Promise.resolve(false),
      },
      configuredPrincipalId
    )

    assert.isNull(await inactiveQuery.handle({ assertedActorId: configuredPrincipalId }))
    assert.isNull(await unauthorizedQuery.handle({ assertedActorId: configuredPrincipalId }))
    assert.isNull(
      await unauthorizedQuery.handle({
        assertedActorId: '019fa98a-927e-7cdf-86a3-03dbf6caa186',
      })
    )
  })
})
