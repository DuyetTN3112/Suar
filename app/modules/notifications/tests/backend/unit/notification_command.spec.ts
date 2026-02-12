import { createHash, randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import {
  parseNotificationCommandV1 as parseNotificationCommandV1WithDependencies,
  type NotificationCommandV1Input,
} from '#modules/notifications/domain/notification_command'

const NOW = new Date('2026-07-23T10:00:00.000Z')

function parseNotificationCommandV1(value: unknown, options: { now?: Date } = {}) {
  return parseNotificationCommandV1WithDependencies(value, {
    ...options,
    digest: (canonicalValue) =>
      createHash('sha256').update(canonicalValue, 'utf8').digest('hex'),
  })
}

function validCommand(
  overrides: Partial<NotificationCommandV1Input> = {}
): NotificationCommandV1Input {
  const recipientId = randomUUID()

  return {
    eventId: randomUUID(),
    type: 'task_assigned',
    schemaVersion: 1,
    recipientId,
    scope: { kind: 'user', id: recipientId },
    actor: { type: 'user', id: randomUUID() },
    subject: { type: 'task', id: randomUUID() },
    parameters: {
      assignment: {
        taskTitle: 'Audit notification core',
        sequence: 7,
      },
    },
    occurredAt: '2026-07-23T09:59:00.000Z',
    correlationId: 'request-123',
    dedupeKey: 'task-assigned:assignment-7',
    ...overrides,
  }
}

test.group('Unit | Notification Command V1', () => {
  test('normalizes object order into one stable semantic fingerprint', ({ assert }) => {
    const input = validCommand()
    const reordered = {
      ...input,
      parameters: {
        assignment: {
          sequence: 7,
          taskTitle: 'Audit notification core',
        },
      },
    }

    const first = parseNotificationCommandV1(input, { now: NOW })
    const second = parseNotificationCommandV1(reordered, { now: NOW })

    assert.equal(first.fingerprint.length, 64)
    assert.equal(first.fingerprint, second.fingerprint)
    assert.deepEqual(first.command.parameters, second.command.parameters)
  })

  test('excludes operational correlation id from the semantic fingerprint', ({ assert }) => {
    const input = validCommand()

    const first = parseNotificationCommandV1(input, { now: NOW })
    const retry = parseNotificationCommandV1(
      { ...input, correlationId: 'request-retry-456' },
      { now: NOW }
    )

    assert.equal(first.fingerprint, retry.fingerprint)
    assert.notEqual(first.command.correlationId, retry.command.correlationId)
  })

  test('rejects unknown types, unsupported versions, and plural recipients', ({ assert }) => {
    assert.throws(
      () => parseNotificationCommandV1(validCommand({ type: 'not_registered' }), { now: NOW }),
      /notification type/i
    )
    assert.throws(
      () =>
        parseNotificationCommandV1(
          validCommand({ schemaVersion: 2 as NotificationCommandV1Input['schemaVersion'] }),
          { now: NOW }
        ),
      /schema version/i
    )
    assert.throws(
      () =>
        parseNotificationCommandV1(
          {
            ...validCommand(),
            recipientIds: [randomUUID(), randomUUID()],
          },
          { now: NOW }
        ),
      /recipient/i
    )
  })

  test('rejects producer-controlled URLs at any parameter depth', ({ assert }) => {
    assert.throws(
      () =>
        parseNotificationCommandV1(
          validCommand({
            parameters: {
              task: {
                redirectUrl: 'https://attacker.example/steal',
              },
            },
          }),
          { now: NOW }
        ),
      /url/i
    )
  })

  test('enforces bounded JSON strings and payload size', ({ assert }) => {
    assert.throws(
      () =>
        parseNotificationCommandV1(
          validCommand({
            parameters: {
              value: 'x'.repeat(2_049),
            },
          }),
          { now: NOW }
        ),
      /2 KiB|2048|size/i
    )

    assert.throws(
      () =>
        parseNotificationCommandV1(
          validCommand({
            parameters: Object.fromEntries(
              Array.from({ length: 65 }, (_, index) => [`key_${index}`, index])
            ),
          }),
          { now: NOW }
        ),
      /64|keys/i
    )
  })

  test('enforces the online occurrence clock window', ({ assert }) => {
    assert.throws(
      () =>
        parseNotificationCommandV1(
          validCommand({ occurredAt: '2026-01-01T00:00:00.000Z' }),
          { now: NOW }
        ),
      /180 days|old/i
    )

    assert.throws(
      () =>
        parseNotificationCommandV1(
          validCommand({ occurredAt: '2026-07-23T10:05:01.000Z' }),
          { now: NOW }
        ),
      /future|5 minutes/i
    )
  })
})
