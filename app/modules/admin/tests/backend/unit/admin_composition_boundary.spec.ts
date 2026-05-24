import { existsSync, readFileSync } from 'node:fs'

import { test } from '@japa/runner'

const CONTROLLERS = [
  'app/modules/admin/dashboard/controllers/dashboard/dashboard_controller.ts',
  'app/modules/admin/disputes/controllers/admin_disputes_controller.ts',
  'app/modules/admin/organizations/controllers/organizations/list_organizations_controller.ts',
  'app/modules/admin/users/controllers/users/list_users_controller.ts',
  'app/modules/admin/users/controllers/users/show_user_controller.ts',
  'app/modules/admin/users/controllers/users/suspend_user_controller.ts',
  'app/modules/admin/users/controllers/users/update_user_role_controller.ts',
]

test.group('Admin composition boundary', () => {
  test('controllers consume Admin runtime ports instead of outer composition singletons', ({
    assert,
  }) => {
    for (const controllerPath of CONTROLLERS) {
      assert.notInclude(readFileSync(controllerPath, 'utf8'), '#composition')
    }

    assert.isFalse(existsSync('app/composition/admin_review_dispute_composition.ts'))
    assert.isFalse(existsSync('app/composition/admin_search_composition.ts'))
    assert.isFalse(existsSync('app/modules/admin/bootstrap/admin_search_composition.ts'))
  })

  test('admin user administration crosses runtime ports and outer adapters only', ({
    assert,
  }) => {
    const adminUserConsumers = [
      [
        'app/modules/admin/dashboard/actions/queries/dashboard/get_dashboard_stats_query.ts',
        '#modules/admin/dashboard/actions/ports/outbound/dashboard/admin_user_administration',
      ],
      [
        'app/modules/admin/users/actions/commands/users/suspend_user_command.ts',
        '#modules/admin/users/actions/ports/outbound/users/admin_user_administration',
      ],
      [
        'app/modules/admin/users/actions/commands/users/update_user_system_role_command.ts',
        '#modules/admin/users/actions/ports/outbound/users/admin_user_administration',
      ],
      [
        'app/modules/admin/users/actions/queries/users/get_user_details_query.ts',
        '#modules/admin/users/actions/ports/outbound/users/admin_user_administration',
      ],
      [
        'app/modules/admin/users/actions/queries/users/list_users_query.ts',
        '#modules/admin/users/actions/ports/outbound/users/admin_user_administration',
      ],
    ] as const

    for (const [consumer, localPort] of adminUserConsumers) {
      const source = readFileSync(consumer, 'utf8')
      assert.include(source, localPort)
      assert.notMatch(source, /#modules\/users\//)
      assert.notMatch(source, /admin_user_(queries|mutations)/)
    }

    const port = readFileSync(
      'app/modules/admin/users/actions/ports/outbound/users/admin_user_administration.ts',
      'utf8'
    )
    assert.notMatch(port, /#modules\/users\//)
    assert.notMatch(port, /\bUserModel\b|DateTime/)

    const adapter = readFileSync(
      'app/composition/adapters/admin/administration/admin_user_administration_adapter.ts',
      'utf8'
    )
    assert.include(
      adapter,
      '#modules/admin/users/actions/ports/outbound/users/admin_user_administration'
    )
    assert.include(
      adapter,
      '#composition/adapters/users/composed_user_administration'
    )

    const provider = readFileSync(
      'app/composition/admin/administration/admin_feature_consumer_ports_provider.ts',
      'utf8'
    )
    assert.include(provider, 'AdminUserDirectory')
    assert.include(provider, 'AdminUserLifecycleWriter')

    for (const eliminatedForwarder of [
      'app/modules/admin/infra/repositories/read/admin_user_queries.ts',
      'app/modules/admin/infra/repositories/write/admin_user_mutations.ts',
    ]) {
      assert.isFalse(
        existsSync(eliminatedForwarder),
        `${eliminatedForwarder} must remain eliminated`
      )
    }

    assert.isFalse(
      existsSync('app/modules/users/actions/services/user_public_api.ts'),
      'the Users action-service facade must remain eliminated'
    )

    const userComposition = readFileSync(
      'app/composition/users/user-application/user_application_composition.ts',
      'utf8'
    )
    assert.include(userComposition, 'ComposedUserAdministrationDirectory')
    assert.include(userComposition, 'ComposedUserAdministrationLifecycle')
    assert.notInclude(adapter, 'userPublicApi')
    assert.notInclude(adapter, 'ComposedUserPublicApi')
  })
})
