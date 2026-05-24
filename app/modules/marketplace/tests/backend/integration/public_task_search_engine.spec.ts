import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { taskSearchDocumentReader } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import { makeGetPublicTasksQuery } from '#composition/tasks/task-search/tasks_search_composition'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { GetPublicTasksDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, SkillFactory, TaskFactory, UserFactory } from '#tests/helpers/factories'

process.env['ELASTICSEARCH_NODE'] = process.env['ELASTICSEARCH_NODE'] ?? 'http://127.0.0.1:9200'

test.group('Integration | Public Task Search Engine', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('retrieves public tasks by indexed skill keyword', async ({ assert }) => {
    const creator = await UserFactory.create()
    const matchingTask = await TaskFactory.create({
      creator_id: creator.id,
      title: 'Elasticsearch search platform migration',
      description: 'Move marketplace retrieval to dedicated engine',
      task_visibility: 'external',
      assigned_to: null,
    })
    const secondaryTask = await TaskFactory.create({
      creator_id: creator.id,
      title: 'Routine database maintenance',
      description: 'A lower relevance task that happens to require the same search skill',
      task_visibility: 'external',
      assigned_to: null,
    })
    const hiddenTask = await TaskFactory.create({
      creator_id: creator.id,
      title: 'Internal admin cleanup',
      description: 'No search match expected',
      task_visibility: 'internal',
      assigned_to: null,
    })
    const skill = await SkillFactory.create({ skill_name: 'Elasticsearch' })

    await db.table('task_required_skills').insert([
      {
        id: crypto.randomUUID(),
        task_id: matchingTask.id,
        skill_id: skill.id,
        required_public_proficiency_code: 'l4',
        is_mandatory: true,
      },
      {
        id: crypto.randomUUID(),
        task_id: hiddenTask.id,
        skill_id: skill.id,
        required_public_proficiency_code: 'l4',
        is_mandatory: true,
      },
      {
        id: crypto.randomUUID(),
        task_id: secondaryTask.id,
        skill_id: skill.id,
        required_public_proficiency_code: 'l4',
        is_mandatory: true,
      },
    ])

    const [{ TaskSearchDocumentBuilder }, { TaskSearchIndexRepository }, { searchClient }] =
      await Promise.all([
        import('#modules/search/infra/adapters/entity-search/tasks/task_search_document_builder'),
        import('#modules/search/infra/repositories/entity-search/tasks/task_search_index_repository'),
        import('#platform/search/elasticsearch_client'),
      ])

    const repository = new TaskSearchIndexRepository()
    const builder = new TaskSearchDocumentBuilder(taskSearchDocumentReader)

    await repository.resetIndex()
    await repository.ensureIndex()
    await repository.upsertDocument(await builder.build(matchingTask.id))
    await repository.upsertDocument(await builder.build(secondaryTask.id))
    await repository.upsertDocument(await builder.build(hiddenTask.id))
    await searchClient.indices.refresh({ index: repository.indexName })

    const query = makeGetPublicTasksQuery(makeSystemReviewActionContext(creator.id))
    const result = await query.handle(
      new GetPublicTasksDTO({
        keyword: 'Elasticsearch',
      })
    )

    assert.equal(result.data[0]?.id, matchingTask.id)
    assert.include(
      result.data.map((task) => task.id),
      secondaryTask.id
    )
    assert.notInclude(
      result.data.map((task) => task.id),
      hiddenTask.id
    )
  }).timeout(10000)
})
