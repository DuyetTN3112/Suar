import { readFile } from 'node:fs/promises'

import { test } from '@japa/runner'

const ORGANIZATION_ACTION_FILES = [
  'app/modules/organizations/members/actions/command/add_member_by_email_command.ts',
  'app/modules/organizations/members/actions/command/add_member_command.ts',
  'app/modules/organizations/members/actions/command/bulk_add_members_command.ts',
  'app/modules/organizations/directory/actions/command/create_organization_command.ts',
  'app/modules/organizations/invitations/actions/command/invite_user_command.ts',
  'app/modules/organizations/invitations/actions/command/request_organization_join_command.ts',
  'app/modules/organizations/access/actions/command/switch_organization_command.ts',
  'app/modules/organizations/members/actions/command/transfer_organization_ownership_command.ts',
  'app/modules/organizations/directory/actions/query/get_all_organizations_query.ts',
  'app/modules/organizations/directory/actions/query/get_debug_organization_info_query.ts',
  'app/modules/organizations/directory/actions/query/get_organization_detail_query.ts',
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
      'app/composition/adapters/organization_user_reader_writer_adapter.ts',
      'utf8'
    )
    assert.include(adapterSource, '#composition/user_application_composition')
  })
})
