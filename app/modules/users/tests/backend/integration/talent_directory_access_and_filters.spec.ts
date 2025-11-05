import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/support/proficiency_level_catalog'
import {
  makeGetTalentDirectoryPageQuery,
  makeSearchTalentsQuery,
} from '#modules/users/bootstrap/user_query_factory'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ReviewSessionFactory,
  SkillFactory,
  SkillReviewFactory,
  TaskFactory,
  UserFactory,
  UserSkillFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

interface CurrentOrganizationRow {
  current_organization_id: string | null
}

async function createTalentWorkHistoryRow(input: {
  userId: string
  taskType?: string | null
  businessDomain?: string | null
  problemCategory?: string | null
  roleInTask?: string | null
  techStack?: string[]
  domainTags?: string[]
}) {
  await db.table('user_work_history').insert({
    id: testId(),
    user_id: input.userId,
    task_id: testId(),
    task_assignment_id: testId(),
    organization_id: null,
    project_id: null,
    task_title: `Marketplace filter evidence ${testId()}`,
    task_type: input.taskType ?? 'api_design',
    business_domain: input.businessDomain ?? 'fintech',
    problem_category: input.problemCategory ?? 'compliance',
    role_in_task: input.roleInTask ?? 'architect',
    autonomy_level: null,
    collaboration_type: 'solo',
    tech_stack: JSON.stringify(input.techStack ?? ['AdonisJS']),
    domain_tags: JSON.stringify(input.domainTags ?? ['settlement']),
    difficulty: 'hard',
    estimated_hours: 8,
    actual_hours: 7,
    was_on_time: true,
    days_early_or_late: -1,
    measurable_outcomes: JSON.stringify([]),
    estimated_business_value: null,
    knowledge_artifacts: JSON.stringify([]),
    overall_quality_score: 4,
    skill_scores: JSON.stringify([]),
    evidence_links: JSON.stringify([]),
    is_featured: false,
    is_public: true,
    completed_at: new Date(),
  })
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

    const results = await makeSearchTalentsQuery(makeSystemReviewActionContext(viewer.id)).handle({})

    const resultIds = results.map((r) => r.id)
    assert.include(resultIds, searchableUser.id)
    assert.notInclude(resultIds, nonSearchableUser.id)
  })

  test('keyword filter narrows results', async ({ assert }) => {
    const viewer = await UserFactory.create()
    const alice = await UserFactory.create({ username: 'alice_dev' })
    const bob = await UserFactory.create({ username: 'bob_designer' })

    await db.from('users').whereIn('id', [alice.id, bob.id]).update({ profile_settings: JSON.stringify({ is_searchable: true }) })

    const results = await makeSearchTalentsQuery(makeSystemReviewActionContext(viewer.id)).handle({
      q: 'alice',
    })

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
    const task = await TaskFactory.create(omitUndefined({
      organization_id: ownerRow?.current_organization_id ?? undefined,
      creator_id: owner.id,
    }))
    const skill = await SkillFactory.create({ skill_name: 'TypeScript' })

    await db.from('tasks').where('id', task.id).update({
      business_domain: 'saas',
      problem_category: 'new_capability',
      task_type: 'feature_development',
    })

    await db.table('task_required_skills').insert({
      task_id: task.id,
      skill_id: skill.id,
      required_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
      is_mandatory: true,
    })

    const skilledUser = await UserFactory.create()
    const unskilledUser = await UserFactory.create()

    await db.from('users').whereIn('id', [skilledUser.id, unskilledUser.id]).update({ profile_settings: JSON.stringify({ is_searchable: true }) })

    await UserSkillFactory.create({
      user_id: skilledUser.id,
      skill_id: skill.id,
      verified_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
    })

    const results = await makeSearchTalentsQuery(makeSystemReviewActionContext(owner.id)).handle({
      task_id: task.id,
    })

    assert.isTrue(results.length >= 2)
    const skilledResult = results.find((r) => r.id === skilledUser.id)
    const unskilledResult = results.find((r) => r.id === unskilledUser.id)

    if (skilledResult && unskilledResult) {
      assert.isTrue((skilledResult.match_score ?? 0) >= (unskilledResult.match_score ?? 0))
    }

    const titleResults = await makeSearchTalentsQuery(makeSystemReviewActionContext(owner.id)).handle({
      task_id: task.title,
    })
    const titleSkilledResult = titleResults.find((r) => r.id === skilledUser.id)
    const titleUnskilledResult = titleResults.find((r) => r.id === unskilledUser.id)

    if (titleSkilledResult && titleUnskilledResult) {
      assert.isTrue(
        (titleSkilledResult.match_score ?? 0) >= (titleUnskilledResult.match_score ?? 0)
      )
    }
  })

  test('task-based talent ranking is scoped to current organization context', async ({
    assert,
  }) => {
    const { org: orgA, owner: ownerA } = await OrganizationFactory.createWithOwner()
    const { org: orgB, owner: ownerB } = await OrganizationFactory.createWithOwner()
    const orgATask = await TaskFactory.create({
      organization_id: orgA.id,
      creator_id: ownerA.id,
      title: 'Org A staffing task',
    })
    const orgBTask = await TaskFactory.create({
      organization_id: orgB.id,
      creator_id: ownerB.id,
      title: 'Org B private staffing task',
    })

    const orgAContext = {
      ...makeSystemReviewActionContext(ownerA.id),
      organizationId: orgA.id,
    }

    const orgAResults = await makeSearchTalentsQuery(orgAContext).handle({
      task_id: orgATask.id,
    })
    assert.isArray(orgAResults)

    await assert.rejects(
      () =>
        makeSearchTalentsQuery(orgAContext).handle({
          task_id: orgBTask.id,
        }),
      /Task not found by id or title/
    )
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

    const pageQuery = makeGetTalentDirectoryPageQuery(makeSystemReviewActionContext(owner.id))
    const result = await pageQuery.execute({})

    const talentItem = result.talents.find((t) => t.id === talent.id)
    assert.isOk(talentItem)
    assert.isTrue(talentItem?.bookmark.isSaved === true)
    assert.equal(talentItem?.bookmark.notes, 'High priority candidate')
  })

  test('talent directory page keeps server-driven pagination for default browsing', async ({
    assert,
  }) => {
    const viewer = await UserFactory.create()
    const alpha = await UserFactory.create({ username: 'alpha_paged' })
    const bravo = await UserFactory.create({ username: 'bravo_paged' })

    await db.from('users').whereIn('id', [alpha.id, bravo.id]).update({
      profile_settings: JSON.stringify({ is_searchable: true }),
    })

    const pageQuery = makeGetTalentDirectoryPageQuery(makeSystemReviewActionContext(viewer.id))
    const result = await pageQuery.execute({
      page: 2,
      per_page: 1,
    })

    assert.equal(result.page, 2)
    assert.equal(result.per_page, 1)
    assert.equal(result.total_pages, 2)
    assert.equal(result.stats.total, 2)
    assert.lengthOf(result.talents, 1)
    assert.equal(result.talents[0]?.username, 'bravo_paged')
  })

  test('talent directory default browsing supports recruiter sort by trust score', async ({
    assert,
  }) => {
    const viewer = await UserFactory.create()
    const alphaLowTrust = await UserFactory.create({ username: 'alpha_low_trust' })
    const bravoHighTrust = await UserFactory.create({ username: 'bravo_high_trust' })

    await db.from('users').where('id', alphaLowTrust.id).update({
      profile_settings: JSON.stringify({ is_searchable: true }),
      trust_data: JSON.stringify({
        current_tier_code: 'emerging',
        calculated_score: 20,
        raw_score: 20,
        total_verified_reviews: 1,
        last_calculated_at: '2026-07-01T00:00:00.000Z',
      }),
    })
    await db.from('users').where('id', bravoHighTrust.id).update({
      profile_settings: JSON.stringify({ is_searchable: true }),
      trust_data: JSON.stringify({
        current_tier_code: 'trusted',
        calculated_score: 90,
        raw_score: 90,
        total_verified_reviews: 5,
        last_calculated_at: '2026-07-01T00:00:00.000Z',
      }),
    })

    const pageQuery = makeGetTalentDirectoryPageQuery(makeSystemReviewActionContext(viewer.id))
    const result = await pageQuery.execute({
      sort_by: 'trust_score',
      sort_order: 'desc',
    })

    const returnedIds = result.talents.map((talent) => talent.id)
    assert.isBelow(returnedIds.indexOf(bravoHighTrust.id), returnedIds.indexOf(alphaLowTrust.id))
    assert.equal(result.filters.sort_by, 'trust_score')
    assert.equal(result.filters.sort_order, 'desc')
  })

  test('talent directory filters by task-derived role, tech stack, and domain tags', async ({
    assert,
  }) => {
    const recruiter = await UserFactory.create()
    const matchingTalent = await UserFactory.create({ username: 'matching_history_talent' })
    const otherTalent = await UserFactory.create({ username: 'other_history_talent' })

    await db.from('users').whereIn('id', [matchingTalent.id, otherTalent.id]).update({
      profile_settings: JSON.stringify({ is_searchable: true }),
    })

    await createTalentWorkHistoryRow({
      userId: matchingTalent.id,
      roleInTask: 'architect',
      techStack: ['AdonisJS', 'PostgreSQL'],
      domainTags: ['settlement', 'ledger'],
    })
    await createTalentWorkHistoryRow({
      userId: otherTalent.id,
      roleInTask: 'reviewer',
      techStack: ['React'],
      domainTags: ['dashboard'],
    })

    const searchResults = await makeSearchTalentsQuery(
      makeSystemReviewActionContext(recruiter.id)
    ).handle({
      role_in_task: 'architect',
      tech_stack: 'adonis',
      domain_tags: 'settlement',
    })
    const searchResultIds = searchResults.map((talent) => talent.id)

    assert.include(searchResultIds, matchingTalent.id)
    assert.notInclude(searchResultIds, otherTalent.id)

    const pageResult = await makeGetTalentDirectoryPageQuery(
      makeSystemReviewActionContext(recruiter.id)
    ).handle({
      role_in_task: 'architect',
      tech_stack: 'adonis',
      domain_tags: 'settlement',
    })
    const pageResultIds = pageResult.talents.map((talent) => talent.id)

    assert.include(pageResultIds, matchingTalent.id)
    assert.notInclude(pageResultIds, otherTalent.id)
    assert.equal(pageResult.filters.role_in_task, 'architect')
    assert.equal(pageResult.filters.tech_stack, 'adonis')
    assert.equal(pageResult.filters.domain_tags, 'settlement')
  })

  test('directory search returns explainability summary signals for each talent', async ({
    assert,
  }) => {
    const viewer = await UserFactory.create()
    const recruiter = await UserFactory.create()
    const talent = await UserFactory.create({ username: 'signal_user' })
    const reviewedSkill = await SkillFactory.create({ skill_name: 'Architecture' })
    const importedSkill = await SkillFactory.create({ skill_name: 'Communication' })

    await db.from('users').where('id', talent.id).update({
      profile_settings: JSON.stringify({ is_searchable: true }),
    })

    const reviewedUserSkill = await UserSkillFactory.create({
      user_id: talent.id,
      skill_id: reviewedSkill.id,
      verified_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
      total_reviews: 2,
      avg_score: 88,
      avg_percentage: 88,
    })
    const importedUserSkill = await UserSkillFactory.create({
      user_id: talent.id,
      skill_id: importedSkill.id,
      verified_public_proficiency_code: getCanonicalProficiencyLevelValue('middle', 'l7'),
      total_reviews: 0,
      avg_score: null,
      avg_percentage: null,
    })

    await db.from('user_skills').where('id', reviewedUserSkill.id).update({
      source: 'reviewed',
    })
    await db.from('user_skills').where('id', importedUserSkill.id).update({
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
      comment: 'Strong architecture judgment',
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
      dispute_reason: 'Need more context before finalizing level',
      disputed_dimensions: JSON.stringify({ architecture: true }),
      disputed_skill_reviews: JSON.stringify([{ skill_review_id: skillReview.id }]),
      requested_outcome: 'adjust_score',
    })

    const results = await makeSearchTalentsQuery(makeSystemReviewActionContext(viewer.id)).handle({
      q: 'signal_user',
    })

    const item = results.find((result) => result.id === talent.id)
    assert.isOk(item)
    assert.equal(item?.reviewed_skills_count, 1)
    assert.equal(item?.imported_skills_count, 1)
    assert.equal(item?.under_dispute_skills_count, 1)
    assert.equal(item?.latest_confidence_signal, 'high')
  })

})
