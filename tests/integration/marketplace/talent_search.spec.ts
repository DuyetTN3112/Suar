import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { TaskRequirementRepository } from '#modules/tasks/infra/repositories/task_requirement_repository'
import SearchTalentsQuery from '#modules/users/actions/queries/search_talents_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  SkillFactory,
  TaskFactory,
  UserFactory,
  UserSkillFactory,
} from '#tests/helpers/factories'

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
        required_level_code: 'senior',
        is_mandatory: true,
        weight: 5,
        importance: 'critical',
      },
      {
        task_id: task.id,
        skill_id: minorSkill.id,
        required_level_code: 'senior',
        is_mandatory: true,
        weight: 1,
        importance: 'low',
      },
    ])

    await UserSkillFactory.create({
      user_id: strongOnCritical.id,
      skill_id: criticalSkill.id,
      level_code: 'senior',
    })
    await UserSkillFactory.create({
      user_id: strongOnMinor.id,
      skill_id: minorSkill.id,
      level_code: 'senior',
    })

    const results = await new SearchTalentsQuery(makeSystemReviewActionContext(owner.id)).handle({
      task_id: task.id,
    })

    const topUserId = results[0]?.id
    assert.equal(topUserId, strongOnCritical.id)
  })
})
