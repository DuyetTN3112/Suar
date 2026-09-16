import { test } from '@japa/runner'

import {
  attachTaskRequiredSkill,
  configureMarketplaceTestGroup,
  DateTime,
  db,
  OrganizationFactory,
  OrganizationUserFactory,
  SkillFactory,
  TaskFactory,
  testId,
  UserFactory,
} from './support/marketplace_test_support.js'

test.group('Integration | Marketplace search & filters', (group) => {
  configureMarketplaceTestGroup(group)

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
    const { searchPublicApi } = await import(
      '#composition/search/public-api/search_public_api_composition'
    )
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

    await attachTaskRequiredSkill(matchingTask.id, technologySkill.id)
    await attachTaskRequiredSkill(nonMatchingTask.id, softSkill.id)
    await attachTaskRequiredSkill(historicalMatchingTask.id, inactiveTechnologySkill.id)

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
})
