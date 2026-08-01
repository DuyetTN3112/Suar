import { readFileSync } from 'node:fs'

import { test } from '@japa/runner'

test.group('Notification worker startup wiring', () => {
  test('Playwright E2E server starts notification workers by default and stops them on exit', ({
    assert,
  }) => {
    const source = readFileSync('scripts/start_e2e_server.sh', 'utf8')

    assert.include(source, 'E2E_START_NOTIFICATION_FANOUT_WORKER:-true')
    assert.include(source, 'node ace notification:fanout-work --poll-ms=100 --batch-size=25 --concurrency=1')
    assert.include(source, 'notification_fanout_worker_pid="$!"')
    assert.include(source, 'kill -TERM "$notification_fanout_worker_pid"')

    assert.include(source, 'E2E_START_NOTIFICATION_OUTBOX_WORKER:-true')
    assert.include(source, 'node ace notification:outbox-work --poll-ms=100 --batch-size=25 --concurrency=1')
    assert.include(source, 'notification_outbox_worker_pid="$!"')
    assert.include(source, 'kill -TERM "$notification_outbox_worker_pid"')
  })

  test('Docker compose includes long-running notification worker services', ({ assert }) => {
    const source = readFileSync('docker/docker-compose.yml', 'utf8')

    assert.include(source, 'notification-fanout-worker:')
    assert.include(source, 'command: ["node", "ace", "notification:fanout-work"]')
    assert.include(source, 'notification-outbox-worker:')
    assert.include(source, 'command: ["node", "ace", "notification:outbox-work"]')
    assert.include(source, 'NOTIFICATION_STORE=postgres')
  })
})
