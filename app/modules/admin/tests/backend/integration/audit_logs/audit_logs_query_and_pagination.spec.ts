import { test } from '@japa/runner'

import {
  configureAuditLogsTestGroup,
  countAuditEvents,
  db,
  makeSystemAdminActionContext,
  UserFactory,
} from './support/audit_logs_test_support.js'

test.group('Integration | Admin Audit Logs - Query & Pagination', (group) => {
  const ctx = configureAuditLogsTestGroup(group)

  test('lists Postgres-backed audit logs and resolves user info from Postgres', async ({
    assert,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const actor = await UserFactory.create({ username: 'audit_target_user' })
    const viewEventsBefore = await countAuditEvents('admin.audit_log.viewed')

    await db.table('audit_events').insert({
      user_id: actor.id,
      action: 'test_admin_audit_log',
      entity_type: 'task',
      entity_id: 'task-test-id',
      old_values: JSON.stringify({ status: 'todo' }),
      new_values: JSON.stringify({ status: 'done' }),
      ip_address: '127.0.0.1',
      user_agent: 'integration-test',
      occurred_at: new Date(),
    })

    const result = await ctx.makeQuery(makeSystemAdminActionContext(superadmin.id)).handle({
      page: 1,
      perPage: 50,
      search: actor.username,
    })

    const log = result.data.find((item) => item.action === 'test_admin_audit_log')
    assert.isDefined(log)
    assert.equal(log?.user?.id, actor.id)
    assert.equal(log?.user?.username, actor.username)
    assert.equal(log?.resource_type, 'task')
    assert.equal(log?.resource_id, 'task-test-id')
    const newValues = (log?.details['new_values'] ?? {}) as { status?: string }
    assert.equal(newValues.status, 'done')
    assert.equal(await countAuditEvents('admin.audit_log.viewed'), viewEventsBefore + 1)
  })

  test('supports cursor pagination for older audit log windows without duplicates', async ({
    assert,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const actor = await UserFactory.create({ username: 'cursor_audit_user' })
    const baseTime = new Date('2026-07-05T12:00:00.000Z')

    for (let index = 0; index < 4; index++) {
      await db.table('audit_events').insert({
        user_id: actor.id,
        action: `cursor_audit_${index}`,
        entity_type: 'task',
        entity_id: `task-${index}`,
        old_values: JSON.stringify({ status: 'todo' }),
        new_values: JSON.stringify({ status: 'done' }),
        ip_address: '127.0.0.1',
        user_agent: 'integration-test',
        occurred_at: new Date(baseTime.getTime() - index * 60_000),
      })
    }

    const firstWindow = await ctx.makeQuery(makeSystemAdminActionContext(superadmin.id)).handle({
      page: 1,
      perPage: 2,
      search: actor.username,
    })

    assert.lengthOf(firstWindow.data, 2)
    assert.equal(firstWindow.data[0]?.action, 'cursor_audit_0')
    assert.equal(firstWindow.data[1]?.action, 'cursor_audit_1')
    assert.isTrue(firstWindow.meta.cursor.hasNextPage)
    assert.isNull(firstWindow.meta.cursor.previousCursor)
    assert.isString(firstWindow.meta.cursor.nextCursor)

    const secondWindow = await ctx.makeQuery(makeSystemAdminActionContext(superadmin.id)).handle({
      page: 1,
      perPage: 2,
      after: firstWindow.meta.cursor.nextCursor,
      search: actor.username,
    })

    assert.lengthOf(secondWindow.data, 2)
    assert.equal(secondWindow.data[0]?.action, 'cursor_audit_2')
    assert.equal(secondWindow.data[1]?.action, 'cursor_audit_3')
    assert.isTrue(secondWindow.meta.cursor.hasPreviousPage)
    assert.isFalse(secondWindow.meta.cursor.hasNextPage)
    assert.isString(secondWindow.meta.cursor.previousCursor)
    assert.equal(
      secondWindow.data.filter((item) => firstWindow.data.some((first) => first.id === item.id))
        .length,
      0
    )
    assert.notDeepEqual(
      secondWindow.data.map((item) => item.id),
      firstWindow.data.map((item) => item.id)
    )
  })

  test('treats direct page-number jumps as newest cursor window to avoid offset drift', async ({
    assert,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const actor = await UserFactory.create({ username: 'cursor_page_jump_user' })
    const baseTime = new Date('2026-07-05T13:00:00.000Z')

    for (let index = 0; index < 4; index++) {
      await db.table('audit_events').insert({
        user_id: actor.id,
        action: `cursor_page_jump_${index}`,
        entity_type: 'task',
        entity_id: `jump-task-${index}`,
        old_values: JSON.stringify({ status: 'todo' }),
        new_values: JSON.stringify({ status: 'done' }),
        ip_address: '127.0.0.1',
        user_agent: 'integration-test',
        occurred_at: new Date(baseTime.getTime() - index * 60_000),
      })
    }

    const newestWindow = await ctx.makeQuery(makeSystemAdminActionContext(superadmin.id)).handle({
      page: 1,
      perPage: 2,
      search: actor.username,
    })

    const jumpedWindow = await ctx.makeQuery(makeSystemAdminActionContext(superadmin.id)).handle({
      page: 3,
      perPage: 2,
      search: actor.username,
    })

    assert.deepEqual(
      jumpedWindow.data.map((item) => item.id),
      newestWindow.data.map((item) => item.id)
    )
    assert.equal(jumpedWindow.meta.currentPage, 1)
    assert.equal(jumpedWindow.meta.mode, 'cursor')
  })

  test('user scope only returns audit rows owned by or performed by that user', async ({
    assert,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const actor = await UserFactory.create({ username: 'self_audit_actor' })
    const otherActor = await UserFactory.create({ username: 'other_audit_actor' })

    await db.table('audit_events').insert([
      {
        user_id: actor.id,
        action: 'user.changed_password',
        entity_type: 'user',
        entity_id: actor.id,
        old_values: JSON.stringify({}),
        new_values: JSON.stringify({}),
        ip_address: '127.0.0.1',
        user_agent: 'integration-test',
        occurred_at: new Date('2026-07-05T14:00:00.000Z'),
      },
      {
        user_id: otherActor.id,
        action: 'user.profile_admin_update',
        entity_type: 'user',
        entity_id: actor.id,
        old_values: JSON.stringify({}),
        new_values: JSON.stringify({}),
        ip_address: '127.0.0.1',
        user_agent: 'integration-test',
        occurred_at: new Date('2026-07-05T14:01:00.000Z'),
      },
      {
        user_id: otherActor.id,
        action: 'user.changed_password',
        entity_type: 'user',
        entity_id: otherActor.id,
        old_values: JSON.stringify({}),
        new_values: JSON.stringify({}),
        ip_address: '127.0.0.1',
        user_agent: 'integration-test',
        occurred_at: new Date('2026-07-05T14:02:00.000Z'),
      },
    ])

    const result = await ctx.makeQuery(makeSystemAdminActionContext(superadmin.id)).handle({
      page: 1,
      perPage: 50,
      surface: 'user',
      actorUserId: actor.id,
    })

    assert.deepEqual(result.data.map((item) => item.action).sort(), [
      'user.changed_password',
      'user.profile_admin_update',
    ])
  })
})
