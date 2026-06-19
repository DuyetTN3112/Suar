import { readFile } from 'node:fs/promises'

import { test } from '@japa/runner'

const ORGANIZATION_ACTION_FILES = [
  'app/modules/organizations/actions/commands/members/add_member_by_email_command.ts',
  'app/modules/organizations/actions/commands/members/add_member_command.ts',
  'app/modules/organizations/actions/commands/members/bulk_add_members_command.ts',
  'app/modules/organizations/actions/commands/directory/create_organization_command.ts',
  'app/modules/organizations/actions/commands/invitations/invite_user_command.ts',
  'app/modules/organizations/actions/commands/invitations/request_organization_join_command.ts',
  'app/modules/organizations/actions/commands/access/switch_organization_command.ts',
  'app/modules/organizations/actions/commands/members/transfer_organization_ownership_command.ts',
  'app/modules/organizations/actions/queries/directory/get_all_organizations_query.ts',
  'app/modules/organizations/actions/queries/directory/get_debug_organization_info_query.ts',
  'app/modules/organizations/actions/queries/directory/get_organization_detail_query.ts',
] as const

test.group('Unit | Organization user boundary architecture', () => {
  test('keeps Users implementation wiring outside the Organizations feature', async ({
    assert,
  }) => {
    for (const file of ORGANIZATION_ACTION_FILES) {
      const source = await readFile(file, 'utf8')

      assert.notInclude(source, '#modules/users/')
      assert.notInclude(source, 'DefaultOrganizationDependencies')
      assert.notInclude(source, 'organization_external_dependencies_impl')
      assert.include(source, 'OrganizationUserReaderWriter')
    }

    const adapterSource = await readFile(
      'app/composition/organizations/directory/adapters/organization_user_reader_writer_adapter.ts',
      'utf8'
    )
    assert.include(adapterSource, '#composition/users/user-application/user_application_composition')
  })
})
