import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { test } from '@japa/runner'

import {
  acquireArchitectureTestLock,
  releaseArchitectureTestLock,
  runArchitectureGuard,
  scanProductionImportSpecifiers,
} from './support/boundary_guard_test_helpers.js'

test.group('Architecture | Public contract boundary guards', (group) => {
  group.setup(acquireArchitectureTestLock)
  group.teardown(releaseArchitectureTestLock)

  test('module domain boundary guard passes', () => {
    runArchitectureGuard('scripts/architecture/check_module_domain_boundary.mjs')
  })

  test('runtime module-boundary guard rejects debt absent from baseline', ({ assert }) => {
    const probeDirectory = 'app/modules/__architecture_guard_probe/actions'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(probe, "import User from '#modules/users/infra/models/profile/user\nvoid User\n")

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_module_domain_boundary.mjs')
      })
    } finally {
      rmSync('app/modules/__architecture_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })

  test('notification transactional staging crosses consumer-owned ports and outer wiring only', ({
    assert,
  }) => {
    for (const eliminatedPath of [
      'app/modules/notifications/public_contracts/notification_creator.ts',
      'app/modules/tasks/bootstrap/task_application_capability_composition.ts',
    ]) {
      assert.isFalse(existsSync(eliminatedPath), `${eliminatedPath} must remain eliminated`)
    }

    const commandContract = readFileSync(
      'app/modules/notifications/public_contracts/notification_command.ts',
      'utf8'
    )
    assert.notMatch(
      commandContract,
      /#modules\/notifications\/(actions|bootstrap|domain|infra|services)\//
    )
    assert.notMatch(commandContract, /@adonisjs\/|@vinejs\/|@poppinss\//)

    assert.deepEqual(
      scanProductionImportSpecifiers(
        [
          'app/modules/tasks',
          'app/modules/organizations',
          'app/modules/projects',
          'app/modules/users',
        ],
        [
          /^#modules\/notifications\/(actions|bootstrap|domain|infra|services)(?:\/|$)/,
          /^#modules\/notifications\/public_contracts\/notification_creator$/,
        ]
      ),
      []
    )

    const outerAdapter = readFileSync(
      'app/composition/adapters/notifications/notification_transaction_stager_adapter.ts',
      'utf8'
    )
    for (const consumerPort of [
      '#modules/organizations/actions/ports/outbound/directory/organization_notification_stager',
      '#modules/projects/actions/ports/outbound/project_notification_stager',
      '#modules/tasks/actions/ports/outbound/task_notification_stager',
      '#modules/users/actions/ports/outbound/user_notification_stager',
    ]) {
      assert.include(outerAdapter, consumerPort)
    }
    assert.notMatch(outerAdapter, /#modules\/notifications\//)

    const notificationComposition = readFileSync(
      'app/composition/notifications/notification-feed/notification_composition.ts',
      'utf8'
    )
    assert.include(
      notificationComposition,
      '#modules/notifications/actions/commands/notification-feed/accept_notification_command'
    )
    assert.include(notificationComposition, 'NotificationTransactionStagerAdapter')
    assert.include(notificationComposition, 'acceptNotificationCommand')
    assert.isFalse(
      existsSync('app/modules/notifications/actions/services/notification_public_api.ts'),
      'the internal notification action-service facade must remain eliminated'
    )
  })

  test('admin review disputes cross the pure capability and outer adapter only', ({ assert }) => {
    assert.isFalse(
      existsSync('app/modules/reviews/public_contracts/review_admin_disputes.ts'),
      'the executable Reviews public facade must remain eliminated'
    )

    const contract = readFileSync(
      'app/modules/reviews/public_contracts/admin_review_dispute_capability.ts',
      'utf8'
    )
    assert.notMatch(contract, /#modules\/reviews\/(actions|infra|services|bootstrap|domain)\//)
    assert.notMatch(contract, /@adonisjs\/|@vinejs\/|@poppinss\//)

    const adminController = readFileSync(
      'app/modules/admin/disputes/controllers/disputes/admin_disputes_controller.ts',
      'utf8'
    )
    assert.notInclude(adminController, 'ai_dispute_evaluations')
    assert.notInclude(adminController, '@adonisjs/lucid/services/db')
    assert.notMatch(adminController, /#modules\/reviews\/actions\//)

    const outerAdapter = readFileSync(
      'app/composition/adapters/reviews/reviews_admin_dispute_read_adapter.ts',
      'utf8'
    )
    assert.include(
      outerAdapter,
      '#modules/admin/disputes/actions/ports/outbound/disputes/review_admin_dispute_read_port'
    )
    assert.include(
      outerAdapter,
      '#modules/disputes/public_contracts/admin_review_dispute_capability'
    )
  })

  test('public contract surface guard passes', () => {
    runArchitectureGuard('scripts/architecture/check_public_contract_surface.mjs')
  })

  test('public-contract guard rejects implementation leakage absent from baseline', ({
    assert,
  }) => {
    const probeDirectory = 'app/modules/__architecture_surface_probe/public_contracts'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(probe, "export { default as User } from '#modules/users/infra/models/profile/user\n")

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_public_contract_surface.mjs')
      })
    } finally {
      rmSync('app/modules/__architecture_surface_probe', {
        force: true,
        recursive: true,
      })
    }
  })
})
