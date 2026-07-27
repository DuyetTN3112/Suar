import { test } from '@japa/runner'

import { LucidSkillSearchDocumentReader } from '#modules/skills/infra/adapters/skill-catalog/lucid_skill_search_document_reader'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, SkillFactory } from '#tests/helpers/factories'

test.group('Integration | Skill Search Engine', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('retrieves active skills by indexed keyword', async ({ assert }) => {
    const matchingSkill = await SkillFactory.create({
      skill_name: 'Elasticsearch',
      skill_code: 'elasticsearch',
      description: 'Distributed search engine for large scale retrieval',
    })
    await SkillFactory.create({
      skill_name: 'GraphQL',
      skill_code: 'graphql',
      description: 'API query language',
    })

    const [{ SkillSearchDocumentBuilder }, { SkillSearchIndexRepository }, { searchClient }] =
      await Promise.all([
        import('#modules/search/infra/adapters/entity-search/skills/skill_search_document_builder'),
        import('#modules/search/infra/repositories/entity-search/skills/skill_search_index_repository'),
        import('#platform/search/elasticsearch_client'),
      ])

    const repository = new SkillSearchIndexRepository()
    const builder = new SkillSearchDocumentBuilder(new LucidSkillSearchDocumentReader())

    await repository.resetIndex()
    await repository.ensureIndex()
    await repository.upsertDocument(await builder.build(matchingSkill.id))
    await searchClient.indices.refresh({ index: repository.indexName })

    const { SearchSkillsViaEngineQuery } = await import(
      '#modules/search/actions/queries/entity-search/search_skills_via_engine_query'
    )

    const result = await new SearchSkillsViaEngineQuery(repository).handle({
      q: 'elastic',
      limit: 5,
    })

    assert.deepEqual(result.map((item) => item.skillId), [matchingSkill.id])
  }).timeout(10000)
})
