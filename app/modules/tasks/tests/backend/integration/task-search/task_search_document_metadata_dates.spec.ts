import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { TaskSkillReaderAdapter } from '#composition/adapters/tasks/task_skill_reader_adapter'
import { TaskSearchIndexRepository } from '#modules/search/infra/repositories/entity-search/tasks/task_search_index_repository'
import { LucidTaskSearchDocumentReader } from '#modules/tasks/infra/adapters/task-reading/lucid_task_search_document_reader'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import {
  cleanupTaskSearchDocData,
  searchDocument,
  setupTaskSearchDocGroup,
  teardownTaskSearchDocGroup,
} from '#modules/tasks/tests/backend/support/task-search/task_search_document_test_support'
import { OrganizationFactory, TaskFactory } from '#tests/helpers/factories'

test.group('Integration | Task Search Document Reader - Metadata and Dates', (group) => {
  group.setup(() => setupTaskSearchDocGroup())
  group.teardown(() => teardownTaskSearchDocGroup())
  group.each.teardown(() => cleanupTaskSearchDocData())

  test('uses the Project-domain snapshot as complete business-domain context and preserves true arrays exactly', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Multi-label discovery task',
      status: 'in_progress',
      label: 'feature',
      priority: 'urgent',
      difficulty: 'expert',
      task_visibility: 'external',
      application_deadline: DateTime.fromISO('2026-08-20T00:00:00.000Z'),
      due_date: DateTime.fromISO('2026-08-30T00:00:00.000Z'),
    })
    task.merge({
      task_type: 'feature_development',
      business_domain: 'data_platform',
      project_business_domains: ['data_platform', 'saas'],
      problem_category: 'new_capability',
      verification_method: 'automated_test',
      tech_stack: ['Elasticsearch', 'TypeScript', 'Elasticsearch'],
      domain_tags: ['Search', 'search', 'Search'],
      learning_objectives: ['Relevance evaluation', 'Faceted navigation'],
      role_in_task: 'architect',
      autonomy_level: 'autonomous',
      collaboration_type: 'cross_team',
      impact_scope: 'organization',
      environment: 'production',
      estimated_users_affected: 10_000,
      external_applications_count: 7,
    })
    await task.save()

    const reader = new LucidTaskSearchDocumentReader(new TaskSkillReaderAdapter())
    const record = await reader.findTaskSearchDocumentRecord(task.id)

    assert.deepEqual(record.businessDomains, ['data_platform', 'saas'])
    assert.equal(record.businessDomainsCoverage, 'complete')
    assert.deepEqual(record.problemCategories, ['new_capability'])
    assert.equal(record.problemCategoriesCoverage, 'legacy_single_value')
    assert.deepEqual(record.taskTypes, ['feature_development'])
    assert.equal(record.taskTypesCoverage, 'legacy_single_value')
    assert.deepEqual(record.techStack, ['Elasticsearch', 'TypeScript', 'Elasticsearch'])
    assert.isTrue(record.techStackKnown)
    assert.deepEqual(record.domainTags, ['Search', 'search', 'Search'])
    assert.isTrue(record.domainTagsKnown)
    assert.deepEqual(record.learningObjectives, ['Relevance evaluation', 'Faceted navigation'])
    assert.isTrue(record.learningObjectivesKnown)
    assert.equal(record.projectId, task.project_id)
    assert.equal(record.status, 'in_progress')
    assert.equal(record.label, 'feature')
    assert.equal(record.priority, 'urgent')
    assert.equal(record.verificationMethod, 'automated_test')
    assert.equal(record.roleInTask, 'architect')
    assert.equal(record.autonomyLevel, 'autonomous')
    assert.equal(record.collaborationType, 'cross_team')
    assert.equal(record.impactScope, 'organization')
    assert.equal(record.environment, 'production')
    assert.equal(DateTime.fromISO(record.applicationDeadline ?? '').toUTC().toISO(), '2026-08-20T00:00:00.000Z')
    assert.equal(DateTime.fromISO(record.dueDate ?? '').toUTC().toISO(), '2026-08-30T00:00:00.000Z')
    assert.equal(record.createdAt, task.created_at.toISO())
    assert.equal(record.estimatedUsersAffected, 10_000)
    assert.equal(record.externalApplicationsCount, 7)
  })

  test('reports missing legacy classifications and absent array metadata without inventing values', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Legacy sparse task',
    })
    task.business_domain = null
    task.project_business_domains = null as unknown as string[]
    task.problem_category = null
    task.task_type = ''
    task.tech_stack = null as unknown as string[]
    task.domain_tags = null as unknown as string[]
    task.learning_objectives = null as unknown as string[]
    task.required_skills_rel = [] as unknown as typeof task.required_skills_rel

    const originalTaskQuery = Task.query.bind(Task) as typeof Task.query
    const fakeTaskQuery = {
      where: () => fakeTaskQuery,
      preload: () => fakeTaskQuery,
      firstOrFail: () => Promise.resolve(task),
    }
    Task.query = (() => fakeTaskQuery) as unknown as typeof Task.query

    try {
      const record = await new LucidTaskSearchDocumentReader(
        new TaskSkillReaderAdapter()
      ).findTaskSearchDocumentRecord(task.id)

      assert.deepEqual(record.businessDomains, [])
      assert.equal(record.businessDomainsCoverage, 'missing')
      assert.deepEqual(record.problemCategories, [])
      assert.equal(record.problemCategoriesCoverage, 'missing')
      assert.deepEqual(record.taskTypes, [])
      assert.equal(record.taskTypesCoverage, 'missing')
      assert.deepEqual(record.techStack, [])
      assert.isFalse(record.techStackKnown)
      assert.deepEqual(record.domainTags, [])
      assert.isFalse(record.domainTagsKnown)
      assert.deepEqual(record.learningObjectives, [])
      assert.isFalse(record.learningObjectivesKnown)
    } finally {
      Task.query = originalTaskQuery
    }
  })

  test('fails closed instead of manufacturing a timestamp for an invalid persisted date', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Corrupt date task',
    })
    task.created_at = DateTime.invalid('corrupt persisted date')
    task.required_skills_rel = [] as unknown as typeof task.required_skills_rel

    const originalTaskQuery = Task.query.bind(Task) as typeof Task.query
    const fakeTaskQuery = {
      where: () => fakeTaskQuery,
      preload: () => fakeTaskQuery,
      firstOrFail: () => Promise.resolve(task),
    }
    Task.query = (() => fakeTaskQuery) as unknown as typeof Task.query

    try {
      await assert.rejects(
        () =>
          new LucidTaskSearchDocumentReader(
            new TaskSkillReaderAdapter()
          ).findTaskSearchDocumentRecord(task.id),
        /invalid persisted date.*created_at/i
      )
    } finally {
      Task.query = originalTaskQuery
    }
  })

  test('fails closed for an invalid optional persisted date', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Corrupt optional date task',
    })
    task.application_deadline = DateTime.invalid('corrupt optional persisted date')
    task.required_skills_rel = [] as unknown as typeof task.required_skills_rel

    const originalTaskQuery = Task.query.bind(Task) as typeof Task.query
    const fakeTaskQuery = {
      where: () => fakeTaskQuery,
      preload: () => fakeTaskQuery,
      firstOrFail: () => Promise.resolve(task),
    }
    Task.query = (() => fakeTaskQuery) as unknown as typeof Task.query

    try {
      await assert.rejects(
        () =>
          new LucidTaskSearchDocumentReader(
            new TaskSkillReaderAdapter()
          ).findTaskSearchDocumentRecord(task.id),
        /invalid persisted date.*application_deadline/i
      )
    } finally {
      Task.query = originalTaskQuery
    }
  })

  test('fails closed for an invalid updated_at timestamp', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Corrupt update timestamp task',
    })
    task.updated_at = DateTime.invalid('corrupt update timestamp')
    task.required_skills_rel = [] as unknown as typeof task.required_skills_rel

    const originalTaskQuery = Task.query.bind(Task) as typeof Task.query
    const fakeTaskQuery = {
      where: () => fakeTaskQuery,
      preload: () => fakeTaskQuery,
      firstOrFail: () => Promise.resolve(task),
    }
    Task.query = (() => fakeTaskQuery) as unknown as typeof Task.query

    try {
      await assert.rejects(
        () =>
          new LucidTaskSearchDocumentReader(
            new TaskSkillReaderAdapter()
          ).findTaskSearchDocumentRecord(task.id),
        /invalid persisted date.*updated_at/i
      )
    } finally {
      Task.query = originalTaskQuery
    }
  })

  test('recalls secondary array labels without leaking private or assigned task metadata', async ({
    assert,
  }) => {
    const repository = new TaskSearchIndexRepository()
    await repository.resetIndex()

    try {
      await repository.bulkUpsertDocuments([
        searchDocument({
          task_id: 'wp03-public-secondary',
          title: 'Public metadata task',
          business_domains: ['primary-domain', 'secondary-recall-token'],
          business_domains_coverage: 'complete',
          domain_tags: ['Search', 'secondary-recall-token', 'Search'],
        }),
        searchDocument({
          task_id: 'wp03-private-decoy',
          title: 'Private metadata task',
          task_visibility: 'private',
          is_public: false,
          domain_tags: ['secondary-recall-token'],
        }),
        searchDocument({
          task_id: 'wp03-assigned-decoy',
          title: 'Assigned metadata task',
          assigned_to: 'private-user',
          domain_tags: ['secondary-recall-token'],
        }),
      ])

      const hits = await repository.search({
        q: 'secondary-recall-token',
        limit: 10,
        organizationId: 'wp03-organization',
        publicOnly: true,
      })

      assert.deepEqual(
        hits.map((hit) => hit.taskId),
        ['wp03-public-secondary']
      )
    } finally {
      await repository.resetIndex()
    }
  }).timeout(15_000)
})
