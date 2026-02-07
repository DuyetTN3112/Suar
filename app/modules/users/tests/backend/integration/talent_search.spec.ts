import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { userExternalDependencies } from '#composition/user_external_dependencies_composition'
import { userTalentRepository } from '#composition/user_persistence_composition'
import { makeSearchTalentsQuery } from '#composition/users_search_composition'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/proficiency_level_catalog'
import { TaskRequirementRepository } from '#modules/tasks/infra/repositories/task_requirement_repository'
import { LucidTalentSearchDocumentReader } from '#modules/users/infra/adapters/lucid_talent_search_document_reader'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  SkillFactory,
  TaskFactory,
  UserFactory,
  UserSkillFactory,
} from '#tests/helpers/factories'

process.env['ELASTICSEARCH_ENABLED'] = 'true'
process.env['ELASTICSEARCH_NODE'] = process.env['ELASTICSEARCH_NODE'] ?? 'http://127.0.0.1:9200'

test.group('Integration | Marketplace Talent Search', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('semantic weight and importance affect ranking for task search', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const criticalSkill = await SkillFactory.create({ skill_name: 'Critical Skill' })
    const minorSkill = await SkillFactory.create({ skill_name: 'Minor Skill' })
    const strongOnCritical = await UserFactory.create({
      credibility_data: null,
    })
    const strongOnMinor = await UserFactory.create({
      credibility_data: null,
    })
    await db.from('tasks').where('id', task.id).update({
      business_domain: 'saas',
      problem_category: 'new_capability',
      task_type: 'feature_development',
    })
    await db.from('users').whereIn('id', [strongOnCritical.id, strongOnMinor.id]).update({
      profile_settings: JSON.stringify({ is_searchable: true }),
    })

    await TaskRequirementRepository.createMany([
      {
        task_id: task.id,
        skill_id: criticalSkill.id,
        required_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
        is_mandatory: true,
        weight: 5,
        importance: 'critical',
      },
      {
        task_id: task.id,
        skill_id: minorSkill.id,
        required_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
        is_mandatory: true,
        weight: 1,
        importance: 'low',
      },
    ])

    await UserSkillFactory.create({
      user_id: strongOnCritical.id,
      skill_id: criticalSkill.id,
      verified_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
    })
    await UserSkillFactory.create({
      user_id: strongOnMinor.id,
      skill_id: minorSkill.id,
      verified_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
    })

    const results = await makeSearchTalentsQuery(makeSystemReviewActionContext(owner.id)).handle({
      task_id: task.id,
    })

    const topUserId = results[0]?.id
    assert.equal(topUserId, strongOnCritical.id)
  })

  test('keyword search can retrieve talents by indexed skill and headline signals', async ({
    assert,
  }) => {
    const viewer = await UserFactory.create()
    const talent = await UserFactory.create({
      username: 'platform_builder',
    })
    const skill = await SkillFactory.create({ skill_name: 'Elasticsearch' })

    await talent
      .merge({
        bio: 'Relevance tuning and distributed systems',
        profile_settings: {
          is_searchable: true,
          show_contact_info: true,
          show_organizations: true,
          show_projects: true,
          show_spider_chart: true,
          show_technical_skills: true,
          custom_headline: 'Search platform engineer',
          preferred_job_types: [],
          preferred_locations: [],
          min_salary_expectation: null,
          salary_currency: 'USD',
          available_from: null,
        },
      })
      .save()

    await UserSkillFactory.create({
      user_id: talent.id,
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
    const searchDocument = await builder.build(talent.id)
    if (!searchDocument) {
      throw new Error('Expected talent search document')
    }
    await repository.upsertDocument(searchDocument)
    await searchClient.indices.refresh({ index: repository.indexName })

    const results = await makeSearchTalentsQuery(makeSystemReviewActionContext(viewer.id)).handle({
      q: 'Elasticsearch',
    })

    assert.include(
      results.map((result) => result.id),
      talent.id
    )
  }).timeout(10000)
})
