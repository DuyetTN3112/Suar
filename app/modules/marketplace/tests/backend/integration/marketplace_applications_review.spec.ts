import { test } from '@japa/runner'

import {
  configureMarketplaceTestGroup,
  DateTime,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  TaskFactory,
  UserFactory,
} from './support/marketplace_test_support.js'

import TaskApplication from '#modules/tasks/infra/models/task-applications/task_application'


test.group('Integration | Marketplace application review & inbox', (group) => {
  configureMarketplaceTestGroup(group)

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
