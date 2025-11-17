import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/support/proficiency_level_catalog'
import ListRecruiterBookmarksWorkspaceQuery from '#modules/users/actions/queries/list_recruiter_bookmarks_workspace_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  ReviewSessionFactory,
  SkillFactory,
  SkillReviewFactory,
  UserFactory,
  UserSkillFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Recruiter Bookmarks Workspace', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('workspace returns explainability summary for bookmarked talent', async ({ assert }) => {
    const recruiter = await UserFactory.create()
    const talent = await UserFactory.create({ username: 'bookmarked_signal_user' })
    const reviewedSkill = await SkillFactory.create({ skill_name: 'Node.js' })
    const importedSkill = await SkillFactory.create({ skill_name: 'Communication' })

    await UserSkillFactory.create({
      user_id: talent.id,
      skill_id: reviewedSkill.id,
      verified_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
      total_reviews: 2,
      avg_score: 91,
      avg_percentage: 91,
    })
    await UserSkillFactory.create({
      user_id: talent.id,
      skill_id: importedSkill.id,
      verified_public_proficiency_code: getCanonicalProficiencyLevelValue('middle', 'l7'),
      total_reviews: 0,
      avg_score: null,
      avg_percentage: null,
    })

    await db.from('user_skills').where('user_id', talent.id).where('skill_id', reviewedSkill.id).update({
      source: 'reviewed',
    })
    await db.from('user_skills').where('user_id', talent.id).where('skill_id', importedSkill.id).update({
      source: 'imported',
    })

    const reviewSession = await ReviewSessionFactory.create({
      reviewee_id: talent.id,
      status: 'completed',
    })
    const skillReview = await SkillReviewFactory.create({
      review_session_id: reviewSession.id,
      reviewer_id: recruiter.id,
      reviewer_type: 'manager',
      skill_id: reviewedSkill.id,
      assigned_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
      comment: 'Strong backend architecture',
    })

    await db.from('skill_reviews').where('id', skillReview.id).update({
      confidence: 'high',
    })

    await db.table('review_disputes').insert({
      id: testId(),
      review_session_id: reviewSession.id,
      task_assignment_id: reviewSession.task_assignment_id,
      task_id: testId(),
      reviewee_id: talent.id,
      opened_by: talent.id,
      status: 'pending',
      dispute_reason: 'Want more evidence before locking level',
      disputed_dimensions: JSON.stringify({ backend: true }),
      disputed_skill_reviews: JSON.stringify([{ skill_review_id: skillReview.id }]),
      requested_outcome: 'adjust_score',
    })

    await db.table('recruiter_bookmarks').insert({
      recruiter_user_id: recruiter.id,
      talent_user_id: talent.id,
      notes: 'Strong shortlist candidate',
      folder: 'Backend',
      rating: 5,
    })

    const result = await new ListRecruiterBookmarksWorkspaceQuery(
      makeSystemReviewActionContext(recruiter.id)
    ).handle({})

    const bookmark = result.bookmarks.find((item) => item.talent.id === talent.id)
    assert.isOk(bookmark)
    assert.equal(bookmark?.talent.reviewed_skills_count, 1)
    assert.equal(bookmark?.talent.imported_skills_count, 1)
    assert.equal(bookmark?.talent.under_dispute_skills_count, 1)
    assert.equal(bookmark?.talent.latest_confidence_signal, 'high')
  })
})
