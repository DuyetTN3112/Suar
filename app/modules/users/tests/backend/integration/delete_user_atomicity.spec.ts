import { test } from '@japa/runner'

import { userAccountActionFactory } from '#composition/user_action_factory'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'
import User from '#modules/users/infra/models/user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'

test.group('Integration | Delete user atomicity', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('rolls back the user deletion when its required audit write fails', async ({
    assert,
    cleanup,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const target = await UserFactory.create()
    const originalLog = auditPublicApi.log.bind(auditPublicApi)

    auditPublicApi.log = () =>
      Promise.reject(new Error('audit dependency diagnostic must remain internal'))
    cleanup(() => {
      auditPublicApi.log = originalLog
    })

    await assert.rejects(() =>
      userAccountActionFactory
        .makeDelete(makeSystemUserActionContext(superadmin.id))
        .handle({ id: target.id })
    )

    const persisted = await User.find(target.id)
    assert.isNotNull(persisted)
    assert.isNull(persisted?.deleted_at)
  })
})
