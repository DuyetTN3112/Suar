import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import TaskApplication from '#modules/tasks/infra/models/task-applications/task_application'
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

  test('public marketplace task page allows anonymous filter-only browsing', async ({ client }) => {
      const response = await client.get('/marketplace/tasks')

      response.assertStatus(200)
  })

  test('public marketplace task page keeps a difficulty filter server-renderable', async ({
    client,
  }) => {
    const response = await client.get('/marketplace/tasks?difficulty=easy')

    response.assertStatus(200)
  })

  test('marketplace applicant can open the public task detail without organization access', async ({
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.createExternalContributor()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      task_visibility: 'external',
      assigned_to: null,
    })

    const response = await client
      .get(`/marketplace/tasks/${task.id}`)
      .redirects(0)
      .loginAs(applicant)

    response.assertStatus(200)
  })

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
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      name: 'Marketplace projection project',
    })

    const visibleTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
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
      data: Array<{
        id: string
        title: string
        can_review_applications?: boolean
        creator?: Record<string, unknown> | null
        project?: {
          id?: string
          name?: string
          owner_id?: string | null
          owner?: Record<string, unknown> | null
        } | null
        organization?: Record<string, unknown> | null
      }>
      pagination: { page: number; perPage: number; total: number }
    }

    assert.notProperty(body, 'success')
    const visibleTaskBody = body.data.find((task) => task.id === visibleTask.id)
    assert.exists(visibleTaskBody)
    assert.isFalse(visibleTaskBody?.can_review_applications ?? true)
    assert.deepInclude(visibleTaskBody?.creator ?? {}, {
      id: owner.id,
      username: owner.username,
    })
    assert.notProperty(visibleTaskBody?.creator ?? {}, 'email')
    assert.notProperty(visibleTaskBody?.creator ?? {}, 'avatar_url')
    assert.deepInclude(visibleTaskBody?.project ?? {}, {
      id: project.id,
      name: project.name,
      owner_id: owner.id,
    })
    assert.deepInclude(visibleTaskBody?.project?.owner ?? {}, {
      id: owner.id,
      username: owner.username,
    })
    assert.notProperty(visibleTaskBody?.project?.owner ?? {}, 'email')
    assert.notProperty(visibleTaskBody?.project?.owner ?? {}, 'avatar_url')
    assert.deepInclude(visibleTaskBody?.organization ?? {}, {
      id: org.id,
      name: org.name,
      logo: org.logo ?? null,
    })
    assert.notProperty(visibleTaskBody?.organization ?? {}, 'owner_id')
    assert.notProperty(visibleTaskBody?.organization ?? {}, 'custom_roles')
    assert.notProperty(visibleTaskBody?.organization ?? {}, 'partner_verification_proof')
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

    // The metadata update is intentionally performed through the model in this fixture. Keep the
    // search projection synchronized before asserting the engine-backed keyword path.
    const { searchPublicApi } = await import('#composition/search/public-api/search_public_api_composition')
    await searchPublicApi.reindexTaskDocument(domainTask.id)

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

    const body = response.body() as {
      data: Array<{ id: string; required_skills_rel?: Array<Record<string, unknown>> }>
      pagination: { total: number }
    }

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
    const inactiveTechnologySkill = await SkillFactory.create({
      skill_name: 'Historical Marketplace Technology Skill',
      category_code: 'technology',
      is_active: false,
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
    const historicalMatchingTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Historical technology category marketplace task',
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
      {
        id: testId(),
        task_id: historicalMatchingTask.id,
        skill_id: inactiveTechnologySkill.id,
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

    const body = response.body() as {
      data: Array<{ id: string; required_skills_rel?: Array<Record<string, unknown>> }>
      pagination: { total: number }
    }

    assert.equal(body.pagination.total, 2)
    assert.include(
      body.data.map((task) => task.id),
      matchingTask.id
    )
    assert.include(
      body.data.map((task) => task.id),
      historicalMatchingTask.id
    )
    assert.notExists(body.data.find((task) => task.id === nonMatchingTask.id))
    const matchingRequirement = body.data.find((task) => task.id === matchingTask.id)
      ?.required_skills_rel?.[0]
    assert.deepInclude(matchingRequirement, {
      task_id: matchingTask.id,
      skill_id: technologySkill.id,
      minimum_level: null,
      target_level: null,
      assessment_ceiling_level: null,
    })
    assert.deepInclude(matchingRequirement?.['skill'], {
      id: technologySkill.id,
      skill_name: 'Marketplace Technology Skill',
      category_code: 'technology',
    })
    assert.notProperty(matchingRequirement ?? {}, 'projectSkill')
    assert.notProperty(matchingRequirement ?? {}, 'rubricVersion')

    const unknownCategoryResponse = await client
      .get('/api/v1/marketplace/tasks?skill_categories=not-a-real-category')
      .loginAs(viewer)
    unknownCategoryResponse.assertStatus(200)
    const unknownCategoryBody = unknownCategoryResponse.body() as {
      data: Array<{ id: string }>
      pagination: { total: number }
    }
    assert.equal(unknownCategoryBody.pagination.total, 0)
    assert.isEmpty(unknownCategoryBody.data)
  })

  test('marketplace skill filters support server-authoritative Any and All modes', async ({
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
    const firstSkill = await SkillFactory.create({ skill_name: 'Marketplace Any Skill A' })
    const secondSkill = await SkillFactory.create({ skill_name: 'Marketplace Any Skill B' })
    const firstTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Marketplace task with both skills',
      task_visibility: 'external',
      assigned_to: null,
    })
    const secondTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Marketplace task with one skill',
      task_visibility: 'external',
      assigned_to: null,
    })
    const requirement = (taskId: string, skillId: string) => ({
      id: testId(),
      task_id: taskId,
      skill_id: skillId,
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
    await db
      .table('task_required_skills')
      .insert([
        requirement(firstTask.id, firstSkill.id),
        requirement(firstTask.id, secondSkill.id),
        requirement(secondTask.id, firstSkill.id),
      ])

    const anyResponse = await client
      .get(`/api/v1/marketplace/tasks?skill_ids=${firstSkill.id},${secondSkill.id}&skill_match=any`)
      .loginAs(viewer)
    anyResponse.assertStatus(200)
    const anyBody = anyResponse.body() as { data: Array<{ id: string }> }

    const allResponse = await client
      .get(`/api/v1/marketplace/tasks?skill_ids=${firstSkill.id},${secondSkill.id}&skill_match=all`)
      .loginAs(viewer)
    allResponse.assertStatus(200)
    const allBody = allResponse.body() as { data: Array<{ id: string }> }

    assert.include(
      anyBody.data.map((task) => task.id),
      firstTask.id
    )
    assert.include(
      anyBody.data.map((task) => task.id),
      secondTask.id
    )
    assert.deepEqual(
      allBody.data.map((task) => task.id),
      [firstTask.id]
    )
  })

  test('filter-only marketplace pagination returns an authorized match outside page one', async ({
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

    const first = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Filter-only first marketplace task',
      task_visibility: 'external',
      assigned_to: null,
    })
    first.merge({ business_domain: 'fintech' })
    await first.save()

    const second = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Filter-only second marketplace task',
      task_visibility: 'external',
      assigned_to: null,
    })
    second.merge({ business_domain: 'fintech' })
    await second.save()

    const pageOne = await client
      .get('/api/v1/marketplace/tasks?business_domain=fintech&per_page=1&page=1')
      .loginAs(viewer)
    pageOne.assertStatus(200)
    const pageOneBody = pageOne.body() as {
      data: Array<{ id: string }>
      pagination: { total: number; page: number; perPage: number; hasNextPage: boolean }
    }
    assert.equal(pageOneBody.pagination.total, 2)
    assert.equal(pageOneBody.pagination.page, 1)
    assert.equal(pageOneBody.pagination.perPage, 1)
    assert.isTrue(pageOneBody.pagination.hasNextPage)
    assert.lengthOf(pageOneBody.data, 1)

    const pageTwo = await client
      .get('/api/v1/marketplace/tasks?business_domain=fintech&per_page=1&page=2')
      .loginAs(viewer)
    pageTwo.assertStatus(200)
    const pageTwoBody = pageTwo.body() as {
      data: Array<{ id: string }>
      pagination: { total: number; page: number; hasNextPage: boolean }
    }
    assert.equal(pageTwoBody.pagination.total, 2)
    assert.equal(pageTwoBody.pagination.page, 2)
    assert.isFalse(pageTwoBody.pagination.hasNextPage)
    assert.lengthOf(pageTwoBody.data, 1)
    assert.notEqual(pageTwoBody.data[0]?.id, pageOneBody.data[0]?.id)
    const pageTwoTaskId = pageTwoBody.data[0]?.id
    assert.isString(pageTwoTaskId)
    if (typeof pageTwoTaskId !== 'string') {
      assert.fail('Expected marketplace task id on page two')
      return
    }
    assert.include([first.id, second.id], pageTwoTaskId)
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
      .whereIn('id', [approvedApplicationId, withdrawnApplicationId])

    assert.lengthOf(taskApplications, 2)
    assert.deepEqual(taskApplications.map((application) => application.application_status).sort(), [
      'approved',
      'withdrawn',
    ])
    assert.lengthOf(parkedRows, 0)
  })

  test('marketplace apply API rejects invalid payloads without creating applications', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.create({ current_organization_id: org.id })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Invalid apply payload target',
      task_visibility: 'external',
      assigned_to: null,
    })

    const emptyPayloadResponse = await client
      .post(`/api/v1/tasks/${task.id}/apply`)
      .loginAs(applicant)
      .json({ message: '   ', portfolioLinks: [] })
    emptyPayloadResponse.assertStatus(422)

    const unsafePortfolioResponse = await client
      .post(`/api/v1/tasks/${task.id}/apply`)
      .loginAs(applicant)
      .json({
        message: 'I can help with this task',
        portfolioLinks: ['javascript:alert(1)'],
      })
    unsafePortfolioResponse.assertStatus(422)

    const missingProtocolResponse = await client
      .post(`/api/v1/tasks/${task.id}/apply`)
      .loginAs(applicant)
      .json({
        message: 'I can help with this task',
        portfolioLinks: ['example.com/work'],
      })
    missingProtocolResponse.assertStatus(422)

    const stored = await TaskApplication.query().where('task_id', task.id)
    assert.lengthOf(stored, 0)
  })

  test('marketplace apply API rejects duplicate and owner applications without duplicate rows', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.create({ current_organization_id: org.id })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Apply business rule contract target',
      task_visibility: 'external',
      assigned_to: null,
    })

    const firstResponse = await client
      .post(`/api/v1/tasks/${task.id}/apply`)
      .loginAs(applicant)
      .json({
        message: 'I can help with this task',
        portfolioLinks: ['https://example.com/work'],
        applicationSource: 'public_listing',
      })
    firstResponse.assertStatus(201)

    const duplicateResponse = await client
      .post(`/api/v1/tasks/${task.id}/apply`)
      .loginAs(applicant)
      .json({
        message: 'I can still help with this task',
        portfolioLinks: ['https://example.com/duplicate'],
        applicationSource: 'public_listing',
      })
    duplicateResponse.assertStatus(400)

    const ownerResponse = await client
      .post(`/api/v1/tasks/${task.id}/apply`)
      .loginAs(owner)
      .json({
        message: 'Owner cannot apply to own task',
        portfolioLinks: ['https://example.com/owner'],
        applicationSource: 'public_listing',
      })
    ownerResponse.assertStatus(400)

    const stored = await TaskApplication.query().where('task_id', task.id)
    assert.lengthOf(stored, 1)
    assert.equal(stored[0]?.applicant_id, applicant.id)
  })

  test('marketplace process API rejects invalid actions without mutating pending application', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.create({ current_organization_id: org.id })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Invalid process action target',
      task_visibility: 'external',
      assigned_to: null,
    })
    const application = await TaskApplication.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
      application_source: 'public_listing',
      message: 'Please consider me',
      portfolio_links: null,
    })

    const response = await client
      .post(`/applications/${application.id}/process`)
      .loginAs(owner)
      .json({ action: 'archive' })
    response.assertStatus(422)

    const stored = await TaskApplication.findOrFail(application.id)
    assert.equal(stored.application_status, 'pending')
    assert.isNull(stored.reviewed_by)
  })

  test('marketplace apply API rejects unauthenticated users without creating an application', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Unauthenticated apply target',
      task_visibility: 'external',
      assigned_to: null,
    })

    const response = await client.post(`/api/v1/tasks/${task.id}/apply`).json({
      message: 'I can help with this task',
      portfolioLinks: ['https://example.com/work'],
      applicationSource: 'public_listing',
    })

    response.assertStatus(401)

    const stored = await TaskApplication.query().where('task_id', task.id).first()
    assert.notExists(stored)
  })

  test('marketplace withdrawal route lets applicants withdraw without org workspace context', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.create({ current_organization_id: null })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Withdraw through marketplace module',
      task_visibility: 'external',
      assigned_to: null,
    })
    const application = await TaskApplication.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
      application_source: 'public_listing',
      message: 'Please consider me',
      portfolio_links: null,
    })

    const response = await client
      .post(`/applications/${application.id}/withdraw`)
      .loginAs(applicant)

    response.assertStatus(204)

    const stored = await TaskApplication.findOrFail(application.id)
    assert.equal(stored.application_status, 'withdrawn')
  })

  test('marketplace my-applications page does not require org workspace context', async ({
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.create({ current_organization_id: null })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Track from marketplace module',
      task_visibility: 'external',
      assigned_to: null,
    })
    await TaskApplication.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
      application_source: 'public_listing',
      message: 'Tracking this application',
      portfolio_links: null,
    })

    const response = await client.get('/my-applications').loginAs(applicant)

    response.assertStatus(200)
  })

  test('marketplace task applications page allows project managers without org workspace context', async ({
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const manager = await UserFactory.create({ current_organization_id: null })
    const applicant = await UserFactory.create()
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
      title: 'Review applicants from marketplace module',
      task_visibility: 'external',
      assigned_to: null,
    })
    await TaskApplication.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
      application_source: 'public_listing',
      message: 'Review me',
      portfolio_links: null,
    })

    const response = await client.get(`/tasks/${task.id}/applications`).loginAs(manager)

    response.assertStatus(200)
  })

  test('organization applications inbox stays org-scoped and hides applicant-private data', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const { org: otherOrg, owner: otherOwner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })
    const applicant = await UserFactory.create({
      username: 'private-candidate',
      email: 'private-candidate@example.com',
    })
    const otherApplicant = await UserFactory.create({
      username: 'other-private-candidate',
      email: 'other-private-candidate@example.com',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Org scoped inbox task',
      task_visibility: 'external',
      assigned_to: null,
    })
    const otherTask = await TaskFactory.create({
      organization_id: otherOrg.id,
      creator_id: otherOwner.id,
      title: 'Other org hidden inbox task',
      task_visibility: 'external',
      assigned_to: null,
    })
    await TaskApplication.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
      application_source: 'public_listing',
      message: 'Private message for org scoped inbox',
      portfolio_links: ['https://portfolio.example.com/private'],
      applied_at: DateTime.fromISO('2026-04-08T08:00:00.000Z'),
    })
    await TaskApplication.create({
      task_id: otherTask.id,
      applicant_id: otherApplicant.id,
      application_status: 'pending',
      application_source: 'public_listing',
      message: 'Other org private message',
      portfolio_links: ['https://portfolio.example.com/other-private'],
      applied_at: DateTime.fromISO('2026-04-09T09:00:00.000Z'),
    })

    const response = await client
      .get('/org/applications')
      .loginAs(owner)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')

    response.assertStatus(200)
    const page = response.body() as {
      component: string
      props: {
        applications: Record<string, unknown>[]
      }
    }
    assert.equal(page.component, 'applications/index')
    assert.lengthOf(page.props.applications, 1)
    assert.deepInclude(page.props.applications[0] ?? {}, {
      task_id: task.id,
      pending_count: 1,
      total_count: 1,
    })

    const serializedPage = JSON.stringify(page)
    assert.include(serializedPage, 'Org scoped inbox task')
    assert.notInclude(serializedPage, 'Other org hidden inbox task')
    assert.notInclude(serializedPage, 'private-candidate')
    assert.notInclude(serializedPage, 'private-candidate@example.com')
    assert.notInclude(serializedPage, 'Private message for org scoped inbox')
    assert.notInclude(serializedPage, 'https://portfolio.example.com/private')

    const memberResponse = await client
      .get('/org/applications')
      .loginAs(member)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')
    memberResponse.assertStatus(403)
  })

  test('marketplace review APIs allow org admins for tasks in their organization', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const admin = await UserFactory.create({ current_organization_id: org.id })
    const applicant = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: admin.id,
      org_role: 'org_admin',
      status: 'approved',
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      title: 'Org admin reviews marketplace applicants',
      task_visibility: 'external',
      assigned_to: null,
    })
    const application = await TaskApplication.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
      application_source: 'public_listing',
      message: 'Org admin can review me',
      portfolio_links: null,
    })

    const applicationsResponse = await client.get(`/tasks/${task.id}/applications`).loginAs(admin)
    applicationsResponse.assertStatus(200)

    const rankingResponse = await client
      .get(`/api/v1/tasks/${task.id}/applications/ranking`)
      .loginAs(admin)
    rankingResponse.assertStatus(200)

    const matchResponse = await client
      .get(`/api/v1/tasks/${task.id}/applications/${application.id}/match`)
      .loginAs(admin)
    matchResponse.assertStatus(200)

    const processResponse = await client
      .post(`/applications/${application.id}/process`)
      .loginAs(admin)
      .json({ action: 'reject', rejectionReason: 'Not the right fit' })
    processResponse.assertStatus(204)

    const stored = await TaskApplication.findOrFail(application.id)
    assert.equal(stored.application_status, 'rejected')
    assert.equal(stored.reviewed_by, admin.id)
  })

  test('marketplace review pages remain readable after a proposal is approved and task is assigned', async ({
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.create()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      title: 'Review assigned marketplace proposal history',
      task_visibility: 'external',
      assigned_to: applicant.id,
    })
    const application = await TaskApplication.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'approved',
      application_source: 'public_listing',
      message: 'Already approved',
      portfolio_links: null,
      reviewed_by: owner.id,
    })

    const applicationsResponse = await client.get(`/tasks/${task.id}/applications`).loginAs(owner)
    applicationsResponse.assertStatus(200)

    const rankingResponse = await client
      .get(`/api/v1/tasks/${task.id}/applications/ranking`)
      .loginAs(owner)
    rankingResponse.assertStatus(200)

    const matchResponse = await client
      .get(`/api/v1/tasks/${task.id}/applications/${application.id}/match`)
      .loginAs(owner)
    matchResponse.assertStatus(200)
  })

  test('marketplace task applications cache does not leak applicant list to outsiders', async ({
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const manager = await UserFactory.create({ current_organization_id: null })
    const outsider = await UserFactory.create({ current_organization_id: null })
    const applicant = await UserFactory.create()
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
      title: 'Do not leak applicant cache',
      task_visibility: 'external',
      assigned_to: null,
    })
    await TaskApplication.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
      application_source: 'public_listing',
      message: 'Private applicant details',
      portfolio_links: null,
    })

    const managerResponse = await client.get(`/tasks/${task.id}/applications`).loginAs(manager)
    managerResponse.assertStatus(200)

    const outsiderResponse = await client.get(`/tasks/${task.id}/applications`).loginAs(outsider)
    outsiderResponse.assertStatus(403)
  })

  test('marketplace match score APIs reject outsiders', async ({ client }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const manager = await UserFactory.create({ current_organization_id: null })
    const outsider = await UserFactory.create({ current_organization_id: null })
    const applicant = await UserFactory.create()
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
      title: 'Protect match scores',
      task_visibility: 'external',
      assigned_to: null,
    })
    const application = await TaskApplication.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
      application_source: 'public_listing',
      message: 'Score me privately',
      portfolio_links: null,
    })

    const managerRankingResponse = await client
      .get(`/api/v1/tasks/${task.id}/applications/ranking`)
      .loginAs(manager)
    managerRankingResponse.assertStatus(200)

    const outsiderRankingResponse = await client
      .get(`/api/v1/tasks/${task.id}/applications/ranking`)
      .loginAs(outsider)
    outsiderRankingResponse.assertStatus(403)

    const managerMatchResponse = await client
      .get(`/api/v1/tasks/${task.id}/applications/${application.id}/match`)
      .loginAs(manager)
    managerMatchResponse.assertStatus(200)

    const outsiderMatchResponse = await client
      .get(`/api/v1/tasks/${task.id}/applications/${application.id}/match`)
      .loginAs(outsider)
    outsiderMatchResponse.assertStatus(403)
  })

  test('marketplace process route allows project managers without org workspace context', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const manager = await UserFactory.create({ current_organization_id: null })
    const applicant = await UserFactory.create()
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
      title: 'Process applicant from marketplace module',
      task_visibility: 'external',
      assigned_to: null,
    })
    const application = await TaskApplication.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
      application_source: 'public_listing',
      message: 'Process me',
      portfolio_links: null,
    })

    const response = await client
      .post(`/applications/${application.id}/process`)
      .loginAs(manager)
      .json({ action: 'reject', rejectionReason: 'Not a match yet' })

    response.assertStatus(204)

    const stored = await TaskApplication.findOrFail(application.id)
    assert.equal(stored.application_status, 'rejected')
    assert.equal(stored.reviewed_by, manager.id)
  })
})
