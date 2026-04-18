import { test } from '@japa/runner'

import { UserWorkHistoryReaderAdapter } from '#composition/adapters/user_work_history_reader_adapter'
import { OrganizationUserStatus } from '#modules/organizations/access/public_contracts/organization_constants'
import { ProjectRole, ProjectVisibility } from '#modules/projects/public_contracts/project_constants'
import GetUserWorkHistoryQuery, {
  GetUserWorkHistoryDTO,
} from '#modules/users/actions/queries/get_user_work_history_query'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Get user work history query', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('isolates self and public history while excluding pending organizations', async ({
    assert,
  }) => {
    const owner = await UserFactory.create()
    const subject = await UserFactory.create()
    const viewer = await UserFactory.create()
    const approvedOrganization = await OrganizationFactory.create({
      name: 'Approved organization',
      owner_id: owner.id,
    })
    const pendingOrganization = await OrganizationFactory.create({
      name: 'Pending organization',
      owner_id: owner.id,
    })

    await OrganizationUserFactory.create({
      organization_id: approvedOrganization.id,
      user_id: subject.id,
      status: OrganizationUserStatus.APPROVED,
    })
    await OrganizationUserFactory.create({
      organization_id: pendingOrganization.id,
      user_id: subject.id,
      status: OrganizationUserStatus.PENDING,
    })

    const publicProject = await ProjectFactory.create({
      name: 'Public project',
      organization_id: approvedOrganization.id,
      creator_id: owner.id,
      owner_id: owner.id,
      visibility: ProjectVisibility.PUBLIC,
    })
    const teamProject = await ProjectFactory.create({
      name: 'Team project',
      organization_id: approvedOrganization.id,
      creator_id: owner.id,
      owner_id: owner.id,
      visibility: ProjectVisibility.TEAM,
    })
    const privateProject = await ProjectFactory.create({
      name: 'Private project',
      organization_id: approvedOrganization.id,
      creator_id: owner.id,
      owner_id: owner.id,
      visibility: ProjectVisibility.PRIVATE,
    })

    await Promise.all(
      [publicProject, teamProject, privateProject].map((project) =>
        ProjectMemberFactory.create({
          project_id: project.id,
          user_id: subject.id,
          project_role: ProjectRole.MEMBER,
        })
      )
    )

    const workHistoryReader = new UserWorkHistoryReaderAdapter()
    const selfResult = await new GetUserWorkHistoryQuery(
      makeSystemUserActionContext(subject.id),
      workHistoryReader
    ).handle(new GetUserWorkHistoryDTO(subject.id))
    const publicResult = await new GetUserWorkHistoryQuery(
      makeSystemUserActionContext(viewer.id),
      workHistoryReader
    ).handle(new GetUserWorkHistoryDTO(subject.id))

    assert.deepEqual(
      selfResult.organizations.map((organization) => organization.org_name),
      ['Approved organization']
    )
    assert.sameMembers(
      selfResult.projects.map((project) => project.project_name),
      ['Public project', 'Team project', 'Private project']
    )
    assert.deepEqual(
      publicResult.projects.map((project) => project.project_name),
      ['Public project']
    )
    assert.equal(publicResult.projects[0]?.org_name, 'Approved organization')
  })
})
