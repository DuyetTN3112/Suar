import { test } from '@japa/runner'

import { userExternalDependencies } from '#composition/user_external_dependencies_composition'
import { userTalentRepository } from '#composition/user_persistence_composition'
import { LucidTalentSearchDocumentReader } from '#modules/users/infra/adapters/lucid_talent_search_document_reader'
import type { UserProfileSettings } from '#modules/users/types/user_profile_data'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  SkillFactory,
  UserFactory,
  UserSkillFactory,
} from '#tests/helpers/factories'

process.env['ELASTICSEARCH_ENABLED'] = 'true'
process.env['ELASTICSEARCH_NODE'] = process.env['ELASTICSEARCH_NODE'] ?? 'http://127.0.0.1:9200'

function buildProfileSettings(overrides: Partial<UserProfileSettings>): UserProfileSettings {
  return {
    is_searchable: false,
    show_contact_info: false,
    show_organizations: true,
    show_projects: true,
    show_spider_chart: true,
    show_technical_skills: true,
    custom_headline: null,
    preferred_job_types: [],
    preferred_locations: [],
    min_salary_expectation: null,
    salary_currency: 'USD',
    available_from: null,
    ...overrides,
  }
}

test.group('Integration | Talent Search Engine', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('builds prefixed talent index names', async ({ assert }) => {
    const { buildTalentSearchIndexName, buildTalentSearchPhysicalIndexName } =
      await import('#modules/search/infra/search_index_names')
    const testIndexPrefix = process.env['ELASTICSEARCH_TEST_INDEX_PREFIX']
    if (!testIndexPrefix) {
      throw new Error('ELASTICSEARCH_TEST_INDEX_PREFIX is required for integration tests')
    }

    assert.equal(buildTalentSearchIndexName(), `${testIndexPrefix}talents`)
    assert.equal(buildTalentSearchPhysicalIndexName(), `${testIndexPrefix}talents_v1`)
  })

  test('indexes searchable talents and retrieves them by keyword', async ({ assert }) => {
    const searchableTalent = await UserFactory.create({
      username: 'elastic_architect',
    })
    const hiddenTalent = await UserFactory.create({
      username: 'hidden_architect',
    })
    const skill = await SkillFactory.create({ skill_name: 'Elasticsearch' })

    await searchableTalent
      .merge({
        profile_settings: buildProfileSettings({
          is_searchable: true,
          custom_headline: 'Search platform engineer',
        }),
      })
      .save()
    await hiddenTalent
      .merge({
        profile_settings: buildProfileSettings({
          is_searchable: false,
          custom_headline: 'Hidden profile',
        }),
      })
      .save()

    await UserSkillFactory.create({
      user_id: searchableTalent.id,
      skill_id: skill.id,
    })

    const [{ TalentSearchDocumentBuilder }, { TalentSearchIndexRepository }, { searchClient }] =
      await Promise.all([
        import('#modules/search/infra/talents/talent_search_document_builder'),
        import('#modules/search/infra/talents/talent_search_index_repository'),
        import('#platform/search/elasticsearch_client'),
      ])

    const repository = new TalentSearchIndexRepository()
    const builder = new TalentSearchDocumentBuilder(
      new LucidTalentSearchDocumentReader(
        userExternalDependencies.skillCatalog,
        userTalentRepository
      )
    )

    await repository.resetIndex()
    await repository.ensureIndex()
    const searchableDocument = await builder.build(searchableTalent.id)
    const hiddenDocument = await builder.build(hiddenTalent.id)
    if (!searchableDocument || !hiddenDocument) {
      throw new Error('Expected persisted talents to produce search documents')
    }
    await repository.upsertDocument(searchableDocument)
    await repository.upsertDocument(hiddenDocument)
    await searchClient.indices.refresh({ index: repository.indexName })
    const aliases = await searchClient.indices.getAlias({ name: repository.indexName })

    const results = await repository.search({
      q: 'elastic',
      limit: 10,
    })

    assert.isAbove(results.length, 0)
    assert.equal(results[0]?.userId, searchableTalent.id)
    assert.property(aliases, repository.physicalIndexName)
    const physicalIndex = aliases[repository.physicalIndexName]
    assert.exists(physicalIndex)
    if (!physicalIndex) {
      throw new Error('Expected the stable talent alias to resolve to its physical v1 index')
    }
    assert.deepInclude(physicalIndex.aliases[repository.indexName], {
      is_write_index: true,
    })
    assert.notInclude(
      results.map((result) => result.userId),
      hiddenTalent.id
    )

    await repository.replaceAllDocuments([searchableDocument])
    const promotedAliases = await searchClient.indices.getAlias({ name: repository.indexName })
    const promotedBackingIndices = Object.keys(promotedAliases)
    assert.lengthOf(promotedBackingIndices, 1)
    assert.isTrue(
      promotedBackingIndices[0]?.startsWith(`${repository.indexName}_v1_`) ?? false,
      'expected a versioned generation behind the stable talent alias'
    )
    assert.isTrue(await searchClient.indices.exists({ index: repository.physicalIndexName }))
    const promotedCount = await searchClient.count({ index: repository.indexName })
    assert.equal(promotedCount.count, 1)
  }).timeout(10000)
})
