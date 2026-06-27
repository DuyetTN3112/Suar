import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { makeDeleteOrganizationCommand } from '#composition/organizations/projects/organization_project_lifecycle_composition'
import { DeleteOrganizationDTO } from '#modules/organizations/actions/dtos/request/directory/delete_organization_dto'
import { makeSystemOrganizationActionContext } from '#modules/organizations/actions/action_context'
import Organization from '#modules/organizations/infra/models/directory/organization'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
} from '#tests/helpers/factories'

test.group('Integration | Delete organization project lifecycle', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('rejects deletion while a non-deleted project still belongs to the organization', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      status: 'completed',
    })

    await assert.rejects(
      () =>
        makeDeleteOrganizationCommand(
          makeSystemOrganizationActionContext(owner.id)
        ).execute(new DeleteOrganizationDTO(org.id)),
      /dự án đang hoạt động/
    )

    const unchanged = await Organization.findOrFail(org.id)
    assert.isNull(unchanged.deleted_at)
  })

  test('allows deletion after every organization project is soft-deleted', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      deleted_at: DateTime.utc(),
    })

    await makeDeleteOrganizationCommand(
      makeSystemOrganizationActionContext(owner.id)
    ).execute(new DeleteOrganizationDTO(org.id))

    const deleted = await Organization.findOrFail(org.id)
    assert.isNotNull(deleted.deleted_at)
  })

  test('rejects permanent deletion while soft-deleted project records are retained', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      deleted_at: DateTime.utc(),
    })

    await assert.rejects(
      () =>
        makeDeleteOrganizationCommand(
          makeSystemOrganizationActionContext(owner.id)
        ).execute(new DeleteOrganizationDTO(org.id, true)),
      /xóa vĩnh viễn.*1 bản ghi dự án/
    )

    const unchanged = await Organization.findOrFail(org.id)
    assert.isNull(unchanged.deleted_at)
  })
})
