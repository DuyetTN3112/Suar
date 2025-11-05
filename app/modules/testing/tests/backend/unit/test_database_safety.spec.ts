import { test } from '@japa/runner'

import {
  getMainTestingAccountConfig,
  resolveTestingSystemRole,
  shouldMountTestingRoutes,
} from '#modules/testing/domain/test_database_safety'

test.group('Testing database safety', () => {
  test('does not mount testing routes on development database', ({ assert }) => {
    assert.isFalse(
      shouldMountTestingRoutes({
        NODE_ENV: 'development',
        PG_DATABASE: 'suar',
        PG_TEST_DATABASE: 'suar_test',
      })
    )
  })

  test('allows testing routes on test runtime database', ({ assert }) => {
    assert.isTrue(
      shouldMountTestingRoutes({
        NODE_ENV: 'test',
        PG_DATABASE: 'suar_test',
        PG_TEST_DATABASE: 'suar_test',
      })
    )
  })

  test('requires explicit dev override and test database for development testing routes', ({
    assert,
  }) => {
    assert.isFalse(
      shouldMountTestingRoutes({
        NODE_ENV: 'development',
        PG_DATABASE: 'suar',
        ALLOW_DEV_TESTING_ROUTES: 'true',
      })
    )
    assert.isTrue(
      shouldMountTestingRoutes({
        NODE_ENV: 'development',
        PG_DATABASE: 'suar_test',
        ALLOW_DEV_TESTING_ROUTES: 'true',
      })
    )
  })

  test('configured admin email domain always resolves to system admin', ({ assert }) => {
    const env = { SUAR_SYSTEM_ADMIN_EMAIL_DOMAIN: 'university.example.test' }

    assert.equal(
      resolveTestingSystemRole('admin@university.example.test', undefined, env),
      'superadmin'
    )
    assert.equal(
      resolveTestingSystemRole('admin@university.example.test', 'registered_user', env),
      'superadmin'
    )
  })

  test('admin-looking email does not get elevated without explicit config', ({ assert }) => {
    assert.equal(resolveTestingSystemRole('admin@example.test', undefined, {}), 'registered_user')
  })

  test('main testing account config only resolves from env', ({ assert }) => {
    assert.isNull(getMainTestingAccountConfig({}))

    assert.deepEqual(
      getMainTestingAccountConfig({
        SUAR_MAIN_TEST_EMAIL: 'main@example.test',
        SUAR_MAIN_TEST_PRIMARY_ORG_NAME: 'Primary Org',
        SUAR_MAIN_TEST_PRIMARY_ORG_SLUG: 'primary-org',
        SUAR_MAIN_TEST_SECONDARY_ORG_NAME: 'Secondary Org',
        SUAR_MAIN_TEST_SECONDARY_ORG_SLUG: 'secondary-org',
        SUAR_MAIN_TEST_SECONDARY_OWNER_EMAIL: 'owner@example.test',
        SUAR_MAIN_TEST_SECONDARY_OWNER_USERNAME: 'Owner',
      }),
      {
        email: 'main@example.test',
        primaryOrgName: 'Primary Org',
        primaryOrgSlug: 'primary-org',
        secondaryOrgName: 'Secondary Org',
        secondaryOrgSlug: 'secondary-org',
        secondaryOwnerEmail: 'owner@example.test',
        secondaryOwnerUsername: 'Owner',
      }
    )
  })
})
