import { test } from '@japa/runner'

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

function buildProfileSettings(
  overrides: Partial<UserProfileSettings>
): UserProfileSettings {
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
    const { buildTalentSearchIndexName } = await import(
      '#modules/search/domain/search_index_names'
    )

    assert.equal(buildTalentSearchIndexName(), 'suar_talents_v1')
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
        import('#modules/search/infra/search_client'),
      ])

    const repository = new TalentSearchIndexRepository()
    const builder = new TalentSearchDocumentBuilder()

    await repository.resetIndex()
    await repository.ensureIndex()
    await repository.upsertDocument(await builder.build(searchableTalent.id))
    await repository.upsertDocument(await builder.build(hiddenTalent.id))
    await searchClient.indices.refresh({ index: repository.indexName })

    const results = await repository.search({
      q: 'elastic',
      limit: 10,
    })

    assert.isAbove(results.length, 0)
    assert.equal(results[0]?.userId, searchableTalent.id)
    assert.notInclude(
      results.map((result) => result.userId),
      hiddenTalent.id
    )
  }).timeout(10000)
})
