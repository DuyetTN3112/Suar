import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import TaskApplication from '#modules/tasks/infra/models/task_application'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { SkillFactory, UserSkillFactory } from '#tests/helpers/factories/review_skill'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Marketplace module routes', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('/marketplace redirects to canonical marketplace tasks route', async ({
    assert,
    client,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const viewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: viewer.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const response = await client.get('/marketplace').redirects(0).loginAs(viewer)

    response.assertStatus(302)
    assert.equal(response.header('location'), '/marketplace/tasks')
  })

  test('legacy marketplace talent routes redirect to org recruiting surfaces', async ({
    assert,
    client,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const viewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: viewer.id,
      org_role: 'org_admin',
      status: 'approved',
    })

    const talentsResponse = await client.get('/marketplace/talents').redirects(0).loginAs(viewer)
    talentsResponse.assertStatus(302)
    assert.equal(talentsResponse.header('location'), '/org/talents')

    const bookmarksResponse = await client
      .get('/marketplace/bookmarks')
      .redirects(0)
      .loginAs(viewer)
    bookmarksResponse.assertStatus(302)
    assert.equal(bookmarksResponse.header('location'), '/org/bookmarks')
  })

  test('org member cannot open recruiter talent and bookmark workspaces', async ({
    assert,
    client,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const talentsResponse = await client.get('/org/talents').redirects(0).loginAs(member)
    talentsResponse.assertStatus(302)
    assert.equal(talentsResponse.header('location'), '/marketplace/tasks')

    const bookmarksResponse = await client.get('/org/bookmarks').redirects(0).loginAs(member)
    bookmarksResponse.assertStatus(302)
    assert.equal(bookmarksResponse.header('location'), '/marketplace/tasks')
  })

  test('org admins can open recruiter talent and bookmark workspaces', async ({ client }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const admin = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: admin.id,
      org_role: 'org_admin',
      status: 'approved',
    })

    const talentsResponse = await client.get('/org/talents').loginAs(admin)
    talentsResponse.assertStatus(200)

    const bookmarksResponse = await client.get('/org/bookmarks').loginAs(admin)
    bookmarksResponse.assertStatus(200)
  })

  test('marketplace module API keeps canonical marketplace tasks response shape', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const viewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: viewer.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const visibleTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Marketplace owned task',
      description: 'Visible through marketplace module route',
      task_visibility: 'external',
      assigned_to: null,
    })

    await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Marketplace hidden internal task',
      description: 'Hidden through marketplace module route',
      task_visibility: 'internal',
      assigned_to: null,
    })

    const response = await client.get('/api/v1/marketplace/tasks').loginAs(viewer)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{ id: string; title: string; can_review_applications?: boolean }>
      pagination: { page: number; perPage: number; total: number }
    }

    assert.notProperty(body, 'success')
    const visibleTaskBody = body.data.find((task) => task.id === visibleTask.id)
    assert.exists(visibleTaskBody)
    assert.isFalse(visibleTaskBody?.can_review_applications ?? true)
    assert.notExists(body.data.find((task) => task.title === 'Marketplace hidden internal task'))
    assert.deepInclude(body.pagination, { page: 1, perPage: 20, total: 1 })
  })

  test('marketplace module API returns an empty result when no visible tasks exist', async ({
    assert,
    client,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const viewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: viewer.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const response = await client.get('/api/v1/marketplace/tasks').loginAs(viewer)
    response.assertStatus(200)

    const body = response.body() as {
      data: unknown[]
      pagination: { page: number; perPage: number; total: number }
    }

    assert.deepEqual(body.data, [])
    assert.deepInclude(body.pagination, { page: 1, perPage: 20, total: 0 })
  })

  test('marketplace task listing marks project managers as proposal reviewers', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const manager = await UserFactory.create({ current_organization_id: null })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: manager.id,
      project_role: 'project_manager',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      title: 'Project manager reviews from marketplace listing',
      task_visibility: 'external',
      assigned_to: null,
    })

    const response = await client.get('/api/v1/marketplace/tasks').loginAs(manager)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{ id: string; can_review_applications?: boolean }>
    }
    const listedTask = body.data.find((item) => item.id === task.id)

    assert.exists(listedTask)
    assert.isTrue(listedTask?.can_review_applications ?? false)
  })

  test('marketplace task listing preserves explicit due date sort instead of priority resort', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const viewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: viewer.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const earlyDeadlineTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Early deadline external task',
      description: 'Lower priority score but earlier due date',
      task_visibility: 'external',
      due_date: DateTime.fromISO('2026-07-20T00:00:00.000Z'),
      assigned_to: null,
    })
    const laterDeadlineTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Later deadline all visibility task',
      description: 'Higher priority score but later due date',
      task_visibility: 'all',
      due_date: DateTime.fromISO('2026-08-20T00:00:00.000Z'),
      assigned_to: null,
    })

    const response = await client
      .get('/api/v1/marketplace/tasks?sort_by=due_date&sort_order=asc')
      .loginAs(viewer)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{ id: string; title: string; priority_score?: number; match_score?: number }>
    }
    const returnedIds = body.data.map((task) => task.id)

    assert.equal(returnedIds[0], earlyDeadlineTask.id)
    assert.equal(returnedIds[1], laterDeadlineTask.id)
    assert.isAbove(body.data[1]?.priority_score ?? 0, body.data[0]?.priority_score ?? 0)
    assert.equal(body.data[1]?.match_score, body.data[1]?.priority_score)
  })

  test('marketplace recommended sort uses applicant skills and work history signals', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const viewer = await UserFactory.create({ current_organization_id: org.id })
    await viewer
      .merge({
        trust_data: {
          current_tier_code: 'trusted',
          calculated_score: 75,
          raw_score: 75,
          total_verified_reviews: 1,
          last_calculated_at: '2026-07-01T00:00:00.000Z',
        },
      })
      .save()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: viewer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const skill = await SkillFactory.create({
      skill_name: 'Marketplace Ranking',
      skill_code: 'marketplace_ranking',
    })
    await UserSkillFactory.create({
      user_id: viewer.id,
      skill_id: skill.id,
      verified_public_proficiency_code: 'l7',
      source: 'reviewed',
    })

    const oldMatchingTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Older but strongly matching marketplace task',
      task_visibility: 'external',
      assigned_to: null,
      due_date: DateTime.fromISO('2026-08-01T00:00:00.000Z'),
    })
    oldMatchingTask.merge({
      task_type: 'api_design',
      business_domain: 'fintech',
      problem_category: 'compliance',
      created_at: DateTime.fromISO('2026-01-01T00:00:00.000Z'),
    })
    await oldMatchingTask.save()
    await db.table('task_required_skills').insert({
      id: testId(),
      task_id: oldMatchingTask.id,
      skill_id: skill.id,
      required_public_proficiency_code: 'l5',
      is_mandatory: true,
      importance: 'high',
      weight: 1,
      requirement_source: 'manual',
      requirement_notes: null,
      proficiency_level_id: null,
      minimum_level_id: null,
      target_level_id: null,
      assessment_ceiling_level_id: null,
      project_skill_id: null,
      rubric_version_id: null,
      source_project_professional_role_id: null,
      source_role_skill_id: null,
    })
    await db.table('user_work_history').insert({
      id: testId(),
      user_id: viewer.id,
      task_id: testId(),
      task_assignment_id: testId(),
      organization_id: org.id,
      project_id: oldMatchingTask.project_id,
      task_title: 'Previous fintech compliance API work',
      task_type: 'api_design',
      business_domain: 'fintech',
      problem_category: 'compliance',
      role_in_task: 'sole_contributor',
      autonomy_level: null,
      collaboration_type: null,
      tech_stack: JSON.stringify([]),
      domain_tags: JSON.stringify([]),
      difficulty: 'hard',
      estimated_hours: null,
      actual_hours: null,
      was_on_time: true,
      days_early_or_late: null,
      measurable_outcomes: JSON.stringify([]),
      estimated_business_value: null,
      knowledge_artifacts: JSON.stringify([]),
      overall_quality_score: null,
      skill_scores: JSON.stringify([]),
      evidence_links: JSON.stringify([]),
      is_featured: false,
      is_public: true,
      completed_at: DateTime.fromISO('2026-02-01T00:00:00.000Z').toSQL(),
    })

    const newerWeakTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Newer generic marketplace task',
      task_visibility: 'external',
      assigned_to: null,
      due_date: DateTime.fromISO('2026-08-02T00:00:00.000Z'),
    })
    newerWeakTask.merge({
      task_type: 'documentation',
      business_domain: 'internal_tooling',
      problem_category: 'automation',
      created_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
    })
    await newerWeakTask.save()

    const response = await client
      .get('/api/v1/marketplace/tasks?sort_by=recommended&sort_order=desc')
      .loginAs(viewer)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        priority_score?: number
        recommendation_reasons?: string[]
        evidence_confidence?: 'low' | 'medium' | 'high'
        skill_match?: number
        domain_match?: number
      }>
    }

    assert.equal(body.data[0]?.id, oldMatchingTask.id)
    assert.equal(body.data[1]?.id, newerWeakTask.id)
    assert.isAbove(body.data[0]?.priority_score ?? 0, body.data[1]?.priority_score ?? 0)
    assert.equal(body.data[0]?.evidence_confidence, 'high')
    assert.isAbove(body.data[0]?.skill_match ?? 0, 0)
    assert.isAbove(body.data[0]?.domain_match ?? 0, 0)
    assert.includeMembers(body.data[0]?.recommendation_reasons ?? [], [
      'Đã có review verified về Marketplace Ranking.',
    ])
  })

  test('org admins do not use personal profile recommended sort on marketplace listing', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const admin = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: admin.id,
      org_role: 'org_admin',
      status: 'approved',
    })
    const skill = await SkillFactory.create({
      skill_name: 'Admin Profile Skill',
      skill_code: 'admin_profile_skill',
    })
    await UserSkillFactory.create({
      user_id: admin.id,
      skill_id: skill.id,
      verified_public_proficiency_code: 'l7',
      source: 'reviewed',
    })

    const oldMatchingTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Old task matching admin personal profile',
      task_visibility: 'external',
      assigned_to: null,
    })
    oldMatchingTask.merge({
      created_at: DateTime.fromISO('2026-01-01T00:00:00.000Z'),
    })
    await oldMatchingTask.save()
    await db.table('task_required_skills').insert({
      id: testId(),
      task_id: oldMatchingTask.id,
      skill_id: skill.id,
      required_public_proficiency_code: 'l5',
      is_mandatory: true,
      importance: 'high',
      weight: 1,
      requirement_source: 'manual',
      requirement_notes: null,
      proficiency_level_id: null,
      minimum_level_id: null,
      target_level_id: null,
      assessment_ceiling_level_id: null,
      project_skill_id: null,
      rubric_version_id: null,
      source_project_professional_role_id: null,
      source_role_skill_id: null,
    })

    const newerWeakTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Newer task without admin profile match',
      task_visibility: 'external',
      assigned_to: null,
    })
    newerWeakTask.merge({
      created_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
    })
    await newerWeakTask.save()

    const response = await client
      .get('/api/v1/marketplace/tasks?sort_by=recommended&sort_order=desc')
      .loginAs(admin)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{ id: string; priority_score?: number }>
    }

    assert.equal(body.data[0]?.id, newerWeakTask.id)
    assert.equal(body.data[1]?.id, oldMatchingTask.id)
    assert.isAbove(body.data[1]?.priority_score ?? 0, body.data[0]?.priority_score ?? 0)
  })

  test('marketplace recommended listing exposes weak-evidence warnings', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const viewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: viewer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const skill = await SkillFactory.create({
      skill_name: 'TypeScript',
      skill_code: 'typescript',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Needs verified frontend evidence',
      task_visibility: 'external',
      assigned_to: null,
    })
    task.merge({
      task_type: 'feature_development',
      business_domain: 'saas',
      problem_category: 'new_capability',
    })
    await task.save()
    await db.table('task_required_skills').insert({
      id: testId(),
      task_id: task.id,
      skill_id: skill.id,
      required_public_proficiency_code: 'l5',
      is_mandatory: true,
      importance: 'high',
      weight: 1,
      requirement_source: 'manual',
      requirement_notes: null,
      proficiency_level_id: null,
      minimum_level_id: null,
      target_level_id: null,
      assessment_ceiling_level_id: null,
      project_skill_id: null,
      rubric_version_id: null,
      source_project_professional_role_id: null,
      source_role_skill_id: null,
    })

    const response = await client
      .get('/api/v1/marketplace/tasks?sort_by=recommended')
      .loginAs(viewer)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        evidence_confidence?: 'low' | 'medium' | 'high'
        evidence_warnings?: string[]
        recommendation_risks?: string[]
      }>
    }
    const listedTask = body.data.find((item) => item.id === task.id)

    assert.exists(listedTask)
    assert.equal(listedTask?.evidence_confidence, 'low')
    assert.includeMembers(listedTask?.evidence_warnings ?? [], [
      'Chưa có evidence skill trùng với yêu cầu task.',
      'Ứng viên chưa có work history để đối chiếu domain/loại task.',
    ])
    assert.includeMembers(listedTask?.recommendation_risks ?? [], [
      'Missing mandatory skill TypeScript',
    ])
  })

  test('marketplace keyword search includes task contract metadata fields', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const viewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: viewer.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const domainTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Investigate settlement flow',
      description: 'Debug reconciliation edge cases',
      task_visibility: 'external',
      assigned_to: null,
    })
    domainTask.merge({
      task_type: 'api_design',
      role_in_task: 'architect',
      problem_category: 'compliance',
      business_domain: 'fintech',
      context_background: 'Payment audit trail needs clearer service boundaries',
      tech_stack: ['AdonisJS', 'PostgreSQL'],
      domain_tags: ['payments', 'settlement'],
    })
    await domainTask.save()

    await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Generic external task',
      description: 'No matching metadata',
      task_visibility: 'external',
      assigned_to: null,
    })

    const response = await client.get('/api/v1/marketplace/tasks?keyword=fintech').loginAs(viewer)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        business_domain?: string | null
        task_type?: string | null
        role_in_task?: string | null
        problem_category?: string | null
        context_background?: string | null
        tech_stack?: string[]
        domain_tags?: string[]
      }>
      pagination: { total: number }
    }

    assert.equal(body.pagination.total, 1)
    assert.equal(body.data[0]?.id, domainTask.id)
    assert.include(body.data[0], {
      business_domain: 'fintech',
      task_type: 'api_design',
      role_in_task: 'architect',
      problem_category: 'compliance',
      context_background: 'Payment audit trail needs clearer service boundaries',
    })
    assert.deepEqual(body.data[0]?.tech_stack, ['AdonisJS', 'PostgreSQL'])
    assert.deepEqual(body.data[0]?.domain_tags, ['payments', 'settlement'])
  })

  test('marketplace listing filters by task contract metadata', async ({ assert, client }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const viewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: viewer.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const matchingTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Filtered contract task',
      task_visibility: 'external',
      assigned_to: null,
    })
    matchingTask.merge({
      task_type: 'api_design',
      business_domain: 'fintech',
      problem_category: 'compliance',
      role_in_task: 'architect',
      verification_method: 'security_audit',
      application_deadline: DateTime.now().plus({ days: 3 }),
      tech_stack: ['AdonisJS', 'PostgreSQL'],
      domain_tags: ['settlement', 'risk'],
    })
    await matchingTask.save()

    const nonMatchingTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Different contract task',
      task_visibility: 'external',
      assigned_to: null,
    })
    nonMatchingTask.merge({
      task_type: 'documentation',
      business_domain: 'internal_tooling',
      problem_category: 'automation',
      role_in_task: 'contributor',
      verification_method: 'code_review',
      application_deadline: DateTime.now().minus({ days: 1 }),
      tech_stack: ['Svelte'],
      domain_tags: ['docs'],
    })
    await nonMatchingTask.save()

    const response = await client
      .get(
        '/api/v1/marketplace/tasks?task_type=api_design&business_domain=fintech&problem_category=compliance&role_in_task=architect&verification_method=security_audit&tech_stack=AdonisJS&domain_tags=settlement&accepting_applications=open'
      )
      .loginAs(viewer)
    response.assertStatus(200)

    const body = response.body() as { data: Array<{ id: string }>; pagination: { total: number } }

    assert.equal(body.pagination.total, 1)
    assert.equal(body.data[0]?.id, matchingTask.id)
    assert.notExists(body.data.find((task) => task.id === nonMatchingTask.id))
  })

  test('marketplace listing filters task requirements by skill category', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const viewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: viewer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const technologySkill = await SkillFactory.create({
      skill_name: 'Marketplace Technology Skill',
      category_code: 'technology',
    })
    const softSkill = await SkillFactory.create({
      skill_name: 'Marketplace Soft Skill',
      category_code: 'soft_skill',
    })

    const matchingTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Technology category marketplace task',
      task_visibility: 'external',
      assigned_to: null,
    })
    const nonMatchingTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Soft skill category marketplace task',
      task_visibility: 'external',
      assigned_to: null,
    })
    await db.table('task_required_skills').insert([
      {
        id: testId(),
        task_id: matchingTask.id,
        skill_id: technologySkill.id,
        required_public_proficiency_code: 'l5',
        is_mandatory: true,
        importance: 'high',
        weight: 1,
        requirement_source: 'manual',
        requirement_notes: null,
        proficiency_level_id: null,
        minimum_level_id: null,
        target_level_id: null,
        assessment_ceiling_level_id: null,
        project_skill_id: null,
        rubric_version_id: null,
        source_project_professional_role_id: null,
        source_role_skill_id: null,
      },
      {
        id: testId(),
        task_id: nonMatchingTask.id,
        skill_id: softSkill.id,
        required_public_proficiency_code: 'l5',
        is_mandatory: true,
        importance: 'high',
        weight: 1,
        requirement_source: 'manual',
        requirement_notes: null,
        proficiency_level_id: null,
        minimum_level_id: null,
        target_level_id: null,
        assessment_ceiling_level_id: null,
        project_skill_id: null,
        rubric_version_id: null,
        source_project_professional_role_id: null,
        source_role_skill_id: null,
      },
    ])

    const response = await client
      .get('/api/v1/marketplace/tasks?skill_categories=technology')
      .loginAs(viewer)
    response.assertStatus(200)

    const body = response.body() as { data: Array<{ id: string }>; pagination: { total: number } }

    assert.equal(body.pagination.total, 1)
    assert.equal(body.data[0]?.id, matchingTask.id)
    assert.notExists(body.data.find((task) => task.id === nonMatchingTask.id))
  })

  test('marketplace apply API stores applications in task_applications during phase 1', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: applicant.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Apply through marketplace module',
      task_visibility: 'external',
      assigned_to: null,
    })

    const response = await client
      .post(`/api/v1/tasks/${task.id}/apply`)
      .loginAs(applicant)
      .json({
        message: 'I can help with this task',
        portfolioLinks: ['https://example.com/work'],
        applicationSource: 'public_listing',
      })

    response.assertStatus(201)
    const body = response.body() as { data?: { id?: string; taskId?: string } }
    assert.isString(body.data?.id)
    assert.equal(body.data?.taskId, task.id)

    const stored = await TaskApplication.query()
      .where('task_id', task.id)
      .where('applicant_id', applicant.id)
      .first()

    assert.exists(stored)
    assert.equal(stored?.application_status, 'pending')
    assert.equal(stored?.application_source, 'public_listing')
  })

  test('marketplace apply process and withdraw routes keep marketplace_applications parked', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const approvedApplicant = await UserFactory.create({ current_organization_id: org.id })
    const withdrawnApplicant = await UserFactory.create({ current_organization_id: org.id })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Canonical marketplace application storage',
      task_visibility: 'external',
      assigned_to: null,
    })
    const withdrawnTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Canonical marketplace withdrawal storage',
      task_visibility: 'external',
      assigned_to: null,
    })

    const approveApplyResponse = await client
      .post(`/api/v1/tasks/${task.id}/apply`)
      .loginAs(approvedApplicant)
      .json({
        message: 'Keep me in task_applications',
        portfolioLinks: ['https://example.com/approved'],
        applicationSource: 'public_listing',
      })
    approveApplyResponse.assertStatus(201)
    const approveApplyBody = approveApplyResponse.body() as { data?: { id?: string } }
    const approvedApplicationId = approveApplyBody.data?.id
    assert.isString(approvedApplicationId)
    if (typeof approvedApplicationId !== 'string') {
      assert.fail('Expected approved application id')
      return
    }

    const processResponse = await client
      .post(`/applications/${approvedApplicationId}/process`)
      .loginAs(owner)
      .json({ action: 'approve', assignmentType: 'external_contributor' })
    processResponse.assertStatus(204)

    const withdrawApplyResponse = await client
      .post(`/api/v1/tasks/${withdrawnTask.id}/apply`)
      .loginAs(withdrawnApplicant)
      .json({
        message: 'Withdraw me from task_applications',
        portfolioLinks: ['https://example.com/withdrawn'],
        applicationSource: 'public_listing',
      })
    withdrawApplyResponse.assertStatus(201)
    const withdrawApplyBody = withdrawApplyResponse.body() as { data?: { id?: string } }
    const withdrawnApplicationId = withdrawApplyBody.data?.id
    assert.isString(withdrawnApplicationId)
    if (typeof withdrawnApplicationId !== 'string') {
      assert.fail('Expected withdrawn application id')
      return
    }

    const withdrawResponse = await client
      .post(`/applications/${withdrawnApplicationId}/withdraw`)
      .loginAs(withdrawnApplicant)
    withdrawResponse.assertStatus(204)

    const taskApplications = await TaskApplication.query()
      .whereIn('id', [approvedApplicationId, withdrawnApplicationId])
      .orderBy('id', 'asc')
    const parkedRows = await db
      .from('marketplace_applications')
