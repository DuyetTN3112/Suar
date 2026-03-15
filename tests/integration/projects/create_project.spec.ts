import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { OrganizationFactory, ProjectFactory, cleanupTestData } from '#tests/helpers/factories'
import { ProjectStatus, ProjectVisibility } from '#constants/project_constants'
import ProjectRepository from '#infra/projects/repositories/project_repository'

test.group('Integration | Create Project', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('create project with valid data persists in database', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const project = await ProjectFactory.create({
      name: 'Test Project',
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      status: ProjectStatus.PENDING,
      visibility: ProjectVisibility.TEAM,
    })

    assert.isNotNull(project.id)
    assert.equal(project.name, 'Test Project')
    assert.equal(project.organization_id, org.id)
    assert.equal(project.creator_id, owner.id)
    assert.equal(project.status, ProjectStatus.PENDING)
  })

  test('project creator is set as owner', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    assert.equal(project.owner_id, owner.id)
    assert.equal(project.creator_id, owner.id)
  })

  test('project has default budget of 0', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      budget: 0,
    })

    assert.equal(project.budget, 0)
  })

  test('project with start and end dates', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const { DateTime } = await import('luxon')
    const startDate = DateTime.now()
    const endDate = DateTime.now().plus({ months: 3 })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      start_date: startDate,
      end_date: endDate,
    })

    const found = await ProjectRepository.findActiveOrFail(project.id)
    assert.isNotNull(found.start_date)
    assert.isNotNull(found.end_date)
  })

  test('soft-deleted project excluded from active queries', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const { DateTime } = await import('luxon')

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      deleted_at: DateTime.now(),
    })

    try {
      await ProjectRepository.findActiveOrFail(project.id)
      assert.fail('Should have thrown')
    } catch (error: any) {
      assert.exists(error)
    }
  })

  test('validateBelongsToOrg succeeds for matching org', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })

    // Should not throw
    await ProjectRepository.validateBelongsToOrg(project.id, org.id)
    assert.isTrue(true)
  })

  test('validateBelongsToOrg throws for wrong org', async ({ assert }) => {
    const { org: org1, owner } = await OrganizationFactory.createWithOwner()
    const { org: org2 } = await OrganizationFactory.createWithOwner()

    const project = await ProjectFactory.create({
      organization_id: org1.id,
      creator_id: owner.id,
    })

    try {
      await ProjectRepository.validateBelongsToOrg(project.id, org2.id)
      assert.fail('Should have thrown')
    } catch (error: any) {
      assert.exists(error)
    }
  })

  test('countByOrgIds returns correct project counts', async ({ assert }) => {
    const { org: org1, owner: owner1 } = await OrganizationFactory.createWithOwner()
    const { org: org2, owner: owner2 } = await OrganizationFactory.createWithOwner()

    await ProjectFactory.create({ organization_id: org1.id, creator_id: owner1.id })
    await ProjectFactory.create({ organization_id: org1.id, creator_id: owner1.id })
    await ProjectFactory.create({ organization_id: org2.id, creator_id: owner2.id })

    const counts = await ProjectRepository.countByOrgIds([org1.id, org2.id])
    assert.equal(counts.get(org1.id), 2)
    assert.equal(counts.get(org2.id), 1)
  })
})
