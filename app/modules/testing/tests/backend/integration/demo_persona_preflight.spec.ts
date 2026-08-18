import { test } from '@japa/runner'

import { socialLoginCommand } from '#composition/auth/session/auth_application_composition'
import { getMainTestingAccountConfig } from '#modules/testing/public_contracts/main_testing_account'
import User from '#modules/users/infra/models/profile/user'

test.group('Integration | Demo persona preflight', () => {
  test('main testing account config stays normalized for the seeded superadmin email', ({
    assert,
  }) => {
    const config = getMainTestingAccountConfig({
      SUAR_MAIN_TEST_EMAIL: ' TD6622I@GRE.AC.UK ',
      SUAR_MAIN_TEST_PRIMARY_ORG_NAME: 'Primary Org',
      SUAR_MAIN_TEST_PRIMARY_ORG_SLUG: 'primary-org',
      SUAR_MAIN_TEST_SECONDARY_ORG_NAME: 'Secondary Org',
      SUAR_MAIN_TEST_SECONDARY_ORG_SLUG: 'secondary-org',
      SUAR_MAIN_TEST_SECONDARY_OWNER_EMAIL: 'Owner@Example.Test',
      SUAR_MAIN_TEST_SECONDARY_OWNER_USERNAME: 'Owner',
    })

    assert.deepEqual(config, {
      email: 'td6622i@gre.ac.uk',
      primaryOrgName: 'Primary Org',
      primaryOrgSlug: 'primary-org',
      secondaryOrgName: 'Secondary Org',
      secondaryOrgSlug: 'secondary-org',
      secondaryOwnerEmail: 'owner@example.test',
      secondaryOwnerUsername: 'Owner',
    })
  })

  test('an unmatched social email still resolves to a fresh registered user shell', async ({
    assert,
  }) => {
    const email = `unmatched-demo-${Date.now()}@example.test`
    const result = await socialLoginCommand.execute('google', {
      id: `google-${Date.now()}`,
      email,
      name: 'Unmatched Demo Persona',
      nickName: 'unmatched-demo-persona',
      token: 'demo-access-token',
      refreshToken: 'demo-refresh-token',
    })

    const user = await User.findByOrFail('email', email)

    assert.isTrue(result.isNewUser)
    assert.equal(user.email, email)
    assert.equal(user.system_role, 'registered_user')
    assert.isNull(user.current_organization_id)
  })
})
