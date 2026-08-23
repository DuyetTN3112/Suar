import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { LucidTaxonomyVersionReader } from '#modules/taxonomy/infra/adapters/taxonomy-governance/lucid_taxonomy_version_reader'
import type { TaxonomyProviderUnavailableError } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_provider'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const NAMESPACE_REVISIONS = [
  ['business-domains', 11],
  ['problem-categories', 12],
  ['task-types', 13],
  ['technologies', 14],
] as const

test.group('Integration | Lucid taxonomy version reader', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(async () => {
    const table = (await db
      .from('information_schema.tables')
      .select('table_name')
      .where('table_schema', 'public')
      .where('table_name', 'task_metadata_taxonomy_revisions')
      .first()) as { table_name?: string } | undefined
    if (table?.table_name === 'task_metadata_taxonomy_revisions') {
      await db
        .from('task_metadata_taxonomy_revisions')
        .whereIn(
          'namespace',
          NAMESPACE_REVISIONS.map(([namespace]) => namespace)
        )
        .delete()
    }
    await teardownApp()
  })

  test('reads the published version for each task metadata namespace from its registry', async ({
    assert,
  }) => {
    await db
      .from('task_metadata_taxonomy_revisions')
      .whereIn('namespace', NAMESPACE_REVISIONS.map(([namespace]) => namespace))
      .delete()
    await db.table('task_metadata_taxonomy_revisions').insert(
      NAMESPACE_REVISIONS.map(([namespace, revision]) => ({
        namespace,
        revision,
        source_fingerprint: `${revision}`.padStart(64, '0'),
      }))
    )

    const reader = new LucidTaxonomyVersionReader()

    for (const [namespace, revision] of NAMESPACE_REVISIONS) {
      assert.equal(await reader.getVersion(namespace), revision)
    }
  })

  test('reads the published skill taxonomy revision from its owned registry', async ({
    assert,
  }) => {
    const row = (await db
      .from('skill_taxonomy_revision')
      .select('revision')
      .where('singleton', true)
      .first()) as { revision: number | string } | undefined

    assert.isDefined(row)
    assert.isAbove(await new LucidTaxonomyVersionReader().getVersion('skills'), 0)
  })

  test('fails closed when a supported namespace has no published revision', async ({ assert }) => {
    await db.from('task_metadata_taxonomy_revisions').delete()
    const reader = new LucidTaxonomyVersionReader()

    let error: unknown
    try {
      await reader.getVersion('technologies')
    } catch (caught) {
      error = caught
    }
    assert.equal(
      (error as TaxonomyProviderUnavailableError).code,
      'E_TAXONOMY_PROVIDER_UNAVAILABLE'
    )
    assert.equal((error as TaxonomyProviderUnavailableError).namespace, 'technologies')
  })

  test('fails closed for an unsupported namespace without inventing a version', async ({
    assert,
  }) => {
    const reader = new LucidTaxonomyVersionReader()

    let error: unknown
    try {
      await reader.getVersion('organization.private-vocabulary')
    } catch (caught) {
      error = caught
    }
    assert.equal(
      (error as TaxonomyProviderUnavailableError).code,
      'E_TAXONOMY_PROVIDER_UNAVAILABLE'
    )
    assert.equal(
      (error as TaxonomyProviderUnavailableError).namespace,
      'organization.private-vocabulary'
    )
  })

  test('rejects revisions that are not owned by the registry or are not positive', async ({
    assert,
  }) => {
    await db.table('task_metadata_taxonomy_revisions').insert({
      namespace: 'technologies',
      revision: 0,
      source_fingerprint: 'b'.repeat(64),
    })

    const reader = new LucidTaxonomyVersionReader()
    await assert.rejects(() => reader.getVersion('technologies'))

    await db.from('task_metadata_taxonomy_revisions').where('namespace', 'technologies').delete()
    await db.table('task_metadata_taxonomy_revisions').insert({
      namespace: 'technologies',
      revision: 1,
      source_fingerprint: 'not-a-sha256-fingerprint',
    })
    await assert.rejects(() => reader.getVersion('technologies'))
  })
})
