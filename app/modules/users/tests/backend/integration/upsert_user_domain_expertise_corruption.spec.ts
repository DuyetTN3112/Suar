import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import {
  userProfileRepository,
  userTransactionRunner,
} from '#composition/users/user-persistence/user_persistence_composition'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import UpsertUserDomainExpertiseCommand from '#modules/users/actions/commands/talent/upsert_user_domain_expertise_command'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'
import UserDomainExpertise from '#modules/users/infra/models/profile-skills/user_domain_expertise'
import UserWorkHistory from '#modules/users/infra/models/profile/user_work_history'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'

test.group('Integration | Upsert user domain expertise corruption', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('corrupt persisted arrays fail closed without overwriting the last good aggregate', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const history = await UserWorkHistory.create({
      id: randomUUID(),
      user_id: user.id,
      task_id: randomUUID(),
      task_assignment_id: randomUUID(),
      organization_id: null,
      project_id: null,
      task_title: 'Historical delivery',
      task_type: 'feature_development',
      business_domain: 'saas',
      problem_category: 'new_capability',
      role_in_task: 'lead',
      autonomy_level: 'autonomous',
      collaboration_type: 'solo',
      tech_stack: ['TypeScript'],
      domain_tags: ['platform'],
      difficulty: 'hard',
      estimated_hours: 8,
      actual_hours: 7,
      was_on_time: true,
      days_early_or_late: -1,
      measurable_outcomes: [],
      estimated_business_value: null,
      knowledge_artifacts: [],
      overall_quality_score: 4.5,
      skill_scores: [
        {
          skill_name: 'TypeScript',
          assigned_public_proficiency_code: 'l8',
        },
      ],
      evidence_links: [],
      is_featured: false,
      is_public: false,
      completed_at: DateTime.now().minus({ days: 1 }),
    })
    const previousCalculatedAt = DateTime.now().minus({ days: 2 }).startOf('second')
    const existing = await UserDomainExpertise.create({
      user_id: user.id,
      tech_stack_frequency: { preserved: 7 },
      domain_frequency: { preserved: 5 },
      problem_category_frequency: { preserved: 3 },
      top_skills: [{ skill_name: 'Preserved' }],
      calculated_at: previousCalculatedAt,
    })
    const previousUpdatedAt = existing.updated_at

    await db
      .from('user_work_history')
      .where('id', history.id)
      .update({
        tech_stack: db.raw('?::jsonb', [JSON.stringify('database-password-do-not-log')]),
      })

    const command = new UpsertUserDomainExpertiseCommand(
      makeSystemUserActionContext(user.id),
      userTransactionRunner,
      userProfileRepository
    )
    let thrown: unknown
    try {
      await command.handle({ userId: user.id })
    } catch (error) {
      thrown = error
    }

    assert.instanceOf(thrown, PersistedDataIntegrityException)
    assert.equal((thrown as PersistedDataIntegrityException).code, 'E_PERSISTED_DATA_INTEGRITY')
    assert.notInclude(JSON.stringify(thrown), 'database-password-do-not-log')

    await existing.refresh()
    assert.deepEqual(existing.tech_stack_frequency, { preserved: 7 })
    assert.deepEqual(existing.domain_frequency, { preserved: 5 })
    assert.deepEqual(existing.problem_category_frequency, { preserved: 3 })
    assert.deepEqual(existing.top_skills, [{ skill_name: 'Preserved' }])
    assert.equal(existing.calculated_at.toMillis(), previousCalculatedAt.toMillis())
    assert.equal(existing.updated_at.toMillis(), previousUpdatedAt.toMillis())
    assert.equal(
      await UserDomainExpertise.query().where('user_id', user.id).count('* as total').then((rows) => {
        return Number(rows[0]?.$extras['total'] ?? 0)
      }),
      1
    )
  })
})
