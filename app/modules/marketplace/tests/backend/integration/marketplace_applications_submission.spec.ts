import { test } from '@japa/runner'

import {
  configureMarketplaceTestGroup,
  db,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskFactory,
  UserFactory,
} from './support/marketplace_test_support.js'

import TaskApplication from '#modules/tasks/infra/models/task-applications/task_application'


test.group('Integration | Marketplace application submission & withdrawal', (group) => {
  configureMarketplaceTestGroup(group)

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
})
