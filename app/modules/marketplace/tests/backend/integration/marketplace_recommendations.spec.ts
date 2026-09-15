import { test } from '@japa/runner'

import {
  attachTaskRequiredSkill,
  attachUserWorkHistory,
  configureMarketplaceTestGroup,
  DateTime,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  SkillFactory,
  TaskFactory,
  UserFactory,
  UserSkillFactory,
} from './support/marketplace_test_support.js'

import TaskApplication from '#modules/tasks/infra/models/task-applications/task_application'


test.group('Integration | Marketplace recommendations & matching', (group) => {
  configureMarketplaceTestGroup(group)

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

    await attachTaskRequiredSkill(oldMatchingTask.id, skill.id)
    const projectId = oldMatchingTask.project_id ?? org.id
    const completedAt =
      DateTime.fromISO('2026-02-01T00:00:00.000Z').toSQL() ?? '2026-02-01 00:00:00'
    await attachUserWorkHistory(viewer.id, org.id, projectId, {
      task_title: 'Previous fintech compliance API work',
      task_type: 'api_design',
      business_domain: 'fintech',
      problem_category: 'compliance',
      completed_at: completedAt,
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
    await attachTaskRequiredSkill(oldMatchingTask.id, skill.id)

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
    await attachTaskRequiredSkill(task.id, skill.id)

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
})
