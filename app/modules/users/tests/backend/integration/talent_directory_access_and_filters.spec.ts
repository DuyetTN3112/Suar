import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { talentExplainabilityProjectionListenerDependencies } from '#composition/user_talent_explainability_listener_composition'
import {
  makeGetTalentDirectoryPageQuery,
  makeSearchTalentsQuery,
} from '#composition/users_search_composition'
import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import ListTalentExplainabilityProjectionsV1Query from '#modules/reviews/actions/queries/list_talent_explainability_projections_v1_query'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { LucidTalentExplainabilityFactSourceReader } from '#modules/reviews/infra/adapters/lucid_review_fact_source_readers'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/proficiency_level_catalog'
import type { SearchTalentsDTO } from '#modules/users/actions/queries/search_talents_query'
import { handleTalentExplainabilityProjectionChanged } from '#modules/users/listeners/talent_explainability_projection_listener'
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
  isPublic?: boolean
}) {
  const rowId = testId()
  await db.table('user_work_history').insert({
    id: rowId,
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
    is_public: input.isPublic ?? true,
    completed_at: new Date(),
  })

  return rowId
}

test.group('Integration | Talent Directory Access and Filters', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    await db.from('domain_event_outbox_replay_history').delete()
    await db.from('domain_event_outbox').delete()
    await cleanupTestData()
  })

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

  test('recruiter history facets use only public work-history evidence', async ({ assert }) => {
    const recruiter = await UserFactory.create()
    const publicTalent = await UserFactory.create({ username: 'public_history_talent' })
    const privateTalent = await UserFactory.create({ username: 'private_history_talent' })

    await db.from('users').whereIn('id', [publicTalent.id, privateTalent.id]).update({
      profile_settings: JSON.stringify({ is_searchable: true }),
    })

    await createTalentWorkHistoryRow({
      userId: publicTalent.id,
      isPublic: true,
    })
    await createTalentWorkHistoryRow({
      userId: privateTalent.id,
      isPublic: false,
    })

    const facetCases: Array<{ label: string; filters: SearchTalentsDTO }> = [
      { label: 'business domain', filters: { business_domain: 'fintech' } },
      { label: 'task type', filters: { task_type: 'api_design' } },
      { label: 'problem category', filters: { problem_category: 'compliance' } },
      { label: 'role in task', filters: { role_in_task: 'architect' } },
      { label: 'technology stack', filters: { tech_stack: 'adonisjs' } },
      { label: 'domain tags', filters: { domain_tags: 'settlement' } },
    ]
    const context = makeSystemReviewActionContext(recruiter.id)

    for (const { label, filters } of facetCases) {
      const searchResult = await makeSearchTalentsQuery(context).handle(filters)
      const directoryResult = await makeGetTalentDirectoryPageQuery(context).handle(filters)
      const searchResultIds = searchResult.map((talent) => talent.id)
      const directoryResultIds = directoryResult.talents.map((talent) => talent.id)

      assert.include(searchResultIds, publicTalent.id, `${label}: search includes public evidence`)
      assert.notInclude(
        searchResultIds,
        privateTalent.id,
        `${label}: search excludes private evidence`
      )
      assert.include(
        directoryResultIds,
        publicTalent.id,
        `${label}: directory includes public evidence`
      )
      assert.notInclude(
        directoryResultIds,
        privateTalent.id,
        `${label}: directory excludes private evidence`
      )
    }
  })

  test('task-aware ranking ignores private work history until it becomes public', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const talent = await UserFactory.create({ username: 'private_rank_history_talent' })

    await db.from('tasks').where('id', task.id).update({
      business_domain: 'fintech',
      problem_category: 'compliance',
      task_type: 'api_design',
    })
    await db.from('users').where('id', talent.id).update({
      profile_settings: JSON.stringify({ is_searchable: true }),
    })
    const workHistoryId = await createTalentWorkHistoryRow({
      userId: talent.id,
      isPublic: false,
    })
    const context = {
      ...makeSystemReviewActionContext(owner.id),
      organizationId: org.id,
    }

    const privateEvidenceResults = await makeSearchTalentsQuery(context).handle({
      task_id: task.id,
    })
    const privateEvidenceResult = privateEvidenceResults.find((item) => item.id === talent.id)

    assert.isOk(privateEvidenceResult)
    assert.equal(privateEvidenceResult?.domain_match, 0)
    assert.equal(privateEvidenceResult?.delivery_reliability, 0)

    await db.from('user_work_history').where('id', workHistoryId).update({ is_public: true })

    const publicEvidenceResults = await makeSearchTalentsQuery(context).handle({
      task_id: task.id,
    })
    const publicEvidenceResult = publicEvidenceResults.find((item) => item.id === talent.id)

    assert.isOk(publicEvidenceResult)
    assert.equal(publicEvidenceResult?.domain_match, 50)
    assert.equal(publicEvidenceResult?.delivery_reliability, 100)
    assert.isAbove(
      publicEvidenceResult?.match_score ?? 0,
      privateEvidenceResult?.match_score ?? 0
    )
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
    const projections = await new ListTalentExplainabilityProjectionsV1Query(
      new LucidTalentExplainabilityFactSourceReader()
    ).execute([talent.id])
    const projection = projections[0]
    if (!projection) throw new Error('Expected a talent explainability projection')
    await handleTalentExplainabilityProjectionChanged({
      ...projection,
      eventType: 'reviews.talent_explainability_projection_changed.v1',
      occurredAt: new Date().toISOString(),
    }, talentExplainabilityProjectionListenerDependencies)

    const results = await makeSearchTalentsQuery(makeSystemReviewActionContext(viewer.id)).handle({
      q: 'signal_user',
    })

    const item = results.find((result) => result.id === talent.id)
    assert.isOk(item)
    assert.equal(item?.reviewed_skills_count, 1)
    assert.equal(item?.imported_skills_count, 1)
    assert.equal(item?.under_dispute_skills_count, 1)
    assert.isNull(item?.latest_confidence_signal)
  })

  test('category filters use active Skills policy in search and paginated directory paths', async ({
    assert,
  }) => {
    const viewer = await UserFactory.create()
    const activeSkillTalent = await UserFactory.create({ username: 'active_category_talent' })
    const inactiveSkillTalent = await UserFactory.create({ username: 'inactive_category_talent' })
    const categoryCode = 'technology'
    const activeSkill = await SkillFactory.create({
      category_code: categoryCode,
      is_active: true,
    })
    const inactiveSkill = await SkillFactory.create({
      category_code: categoryCode,
      is_active: false,
    })

    await db.from('users').whereIn('id', [activeSkillTalent.id, inactiveSkillTalent.id]).update({
      profile_settings: JSON.stringify({ is_searchable: true }),
    })
    await UserSkillFactory.create({
      user_id: activeSkillTalent.id,
      skill_id: activeSkill.id,
    })
    await UserSkillFactory.create({
      user_id: inactiveSkillTalent.id,
      skill_id: inactiveSkill.id,
    })

    const context = makeSystemReviewActionContext(viewer.id)
    const searchResults = await makeSearchTalentsQuery(context).handle({
      skill_categories: [categoryCode],
    })
    const directoryResult = await makeGetTalentDirectoryPageQuery(context).handle({
      skill_categories: [categoryCode],
    })

    assert.include(
      searchResults.map((talent) => talent.id),
      activeSkillTalent.id
    )
    assert.notInclude(
      searchResults.map((talent) => talent.id),
      inactiveSkillTalent.id
    )
    assert.include(
      directoryResult.talents.map((talent) => talent.id),
      activeSkillTalent.id
    )
    assert.notInclude(
      directoryResult.talents.map((talent) => talent.id),
      inactiveSkillTalent.id
    )

    const unresolvedCategory = `missing_${testId()}`
    const unresolvedSearchResults = await makeSearchTalentsQuery(context).handle({
      skill_categories: [unresolvedCategory],
    })
    const unresolvedDirectoryResult = await makeGetTalentDirectoryPageQuery(context).handle({
      skill_categories: [unresolvedCategory],
    })

    assert.lengthOf(unresolvedSearchResults, 0)
    assert.lengthOf(unresolvedDirectoryResult.talents, 0)
  })

})
