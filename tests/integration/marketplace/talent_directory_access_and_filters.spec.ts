import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import GetTalentDirectoryPageQuery from '#modules/users/actions/queries/get_talent_directory_page_query'
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

interface CurrentOrganizationRow {
  current_organization_id: string | null
}

test.group('Integration | Talent Directory Access and Filters', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('only searchable active users appear in directory', async ({ assert }) => {
    const viewer = await UserFactory.create()
    const searchableUser = await UserFactory.create()
    const nonSearchableUser = await UserFactory.create()

    await db.from('users').where('id', searchableUser.id).update({ profile_settings: JSON.stringify({ is_searchable: true }) })
    await db.from('users').where('id', nonSearchableUser.id).update({ profile_settings: JSON.stringify({ is_searchable: false }) })

    const results = await new SearchTalentsQuery(
      makeSystemReviewActionContext(viewer.id)
    ).handle({})

    const resultIds = results.map((r) => r.id)
    assert.include(resultIds, searchableUser.id)
    assert.notInclude(resultIds, nonSearchableUser.id)
  })

  test('keyword filter narrows results', async ({ assert }) => {
    const viewer = await UserFactory.create()
    const alice = await UserFactory.create({ username: 'alice_dev' })
    const bob = await UserFactory.create({ username: 'bob_designer' })

    await db.from('users').whereIn('id', [alice.id, bob.id]).update({ profile_settings: JSON.stringify({ is_searchable: true }) })

    const results = await new SearchTalentsQuery(
      makeSystemReviewActionContext(viewer.id)
    ).handle({ q: 'alice' })

    const resultIds = results.map((r) => r.id)
    assert.include(resultIds, alice.id)
    assert.notInclude(resultIds, bob.id)
  })

  test('task-based search ranks by match score', async ({ assert }) => {
    const { owner } = await OrganizationFactory.createWithOwner()
    const ownerRow = (await db
      .from('users')
      .where('id', owner.id)
      .select('current_organization_id')
      .first()) as CurrentOrganizationRow | null
    const task = await TaskFactory.create({
      organization_id: ownerRow?.current_organization_id ?? undefined,
      creator_id: owner.id,
    })
    const skill = await SkillFactory.create({ skill_name: 'TypeScript' })

    await db.from('tasks').where('id', task.id).update({
      business_domain: 'saas',
      problem_category: 'new_capability',
      task_type: 'feature_development',
    })

    await db.table('task_required_skills').insert({
      task_id: task.id,
      skill_id: skill.id,
      required_level_code: 'senior',
      is_mandatory: true,
    })

    const skilledUser = await UserFactory.create()
    const unskilledUser = await UserFactory.create()

    await db.from('users').whereIn('id', [skilledUser.id, unskilledUser.id]).update({ profile_settings: JSON.stringify({ is_searchable: true }) })

    await UserSkillFactory.create({
      user_id: skilledUser.id,
      skill_id: skill.id,
      level_code: 'senior',
    })

    const results = await new SearchTalentsQuery(
      makeSystemReviewActionContext(owner.id)
    ).handle({ task_id: task.id })

    assert.isTrue(results.length >= 2)
    const skilledResult = results.find((r) => r.id === skilledUser.id)
    const unskilledResult = results.find((r) => r.id === unskilledUser.id)

    if (skilledResult && unskilledResult) {
      assert.isTrue((skilledResult.match_score ?? 0) >= (unskilledResult.match_score ?? 0))
    }
  })

  test('talent directory page includes bookmark state', async ({ assert }) => {
    const { owner } = await OrganizationFactory.createWithOwner()
    const talent = await UserFactory.create()

    await db.from('users').where('id', talent.id).update({ profile_settings: JSON.stringify({ is_searchable: true }) })

    await db.table('recruiter_bookmarks').insert({
      recruiter_user_id: owner.id,
      talent_user_id: talent.id,
      notes: 'High priority candidate',
    })

    const pageQuery = new GetTalentDirectoryPageQuery(
      makeSystemReviewActionContext(owner.id)
    )
    const result = await pageQuery.execute({})

    const talentItem = result.talents.find((t) => t.id === talent.id)
    assert.isOk(talentItem)
    assert.isTrue(talentItem?.bookmark.isSaved === true)
    assert.equal(talentItem?.bookmark.notes, 'High priority candidate')
  })
})
