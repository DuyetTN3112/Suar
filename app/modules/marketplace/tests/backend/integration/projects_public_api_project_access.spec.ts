import { test } from '@japa/runner'

import { MarketplaceProjectAccessAdapter } from '#composition/adapters/marketplace_project_access_adapter'
import { ProjectOrganizationReaderAdapter } from '#composition/adapters/project_organization_reader_adapter'
import {
  projectLifecycleRepository,
  projectMembershipRepository,
} from '#composition/project_persistence_composition'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Marketplace project access adapter', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('delegates marketplace project access checks through the outer adapter', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const outsider = await UserFactory.create()
    const projectMember = await UserFactory.create()
    const orgAdmin = await UserFactory.create()
    const publicProject = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      visibility: 'public',
    })
    const teamProject = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      visibility: 'team',
    })

    await ProjectMemberFactory.create({
      project_id: teamProject.id,
      user_id: projectMember.id,
      project_role: 'project_member',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: orgAdmin.id,
      org_role: 'org_admin',
      status: 'approved',
    })

    const adapter = new MarketplaceProjectAccessAdapter(
      new ProjectOrganizationReaderAdapter(),
      projectLifecycleRepository,
      projectMembershipRepository
    )

    assert.isTrue(await adapter.canViewProjectTasks(publicProject.id, outsider.id))
    assert.isFalse(await adapter.canViewProjectTasks(teamProject.id, outsider.id))
    assert.isTrue(await adapter.canViewProjectTasks(teamProject.id, projectMember.id))

    assert.isTrue(await adapter.canManageProjectTasks(teamProject.id, projectMember.id))
    assert.isTrue(await adapter.canManageProjectTasks(teamProject.id, orgAdmin.id))
    assert.isFalse(await adapter.canManageProjectTasks(teamProject.id, outsider.id))
  })
})
