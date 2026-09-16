import { test } from '@japa/runner'

import type { NotificationFanoutShutdownSignalSource } from '#composition/command_support/notification_fanout_runtime'
import {
  bindNotificationFanoutShutdownSignals,
  waitForNotificationFanoutPoll,
} from '#composition/command_support/notification_fanout_runtime'

class TestSignalSource implements NotificationFanoutShutdownSignalSource {
  private readonly listeners = new Map<'SIGINT' | 'SIGTERM', Set<() => void>>()

  once(signal: 'SIGINT' | 'SIGTERM', listener: () => void): void {
    const listeners = this.listeners.get(signal) ?? new Set()
    listeners.add(listener)
    this.listeners.set(signal, listeners)
  }

  removeListener(signal: 'SIGINT' | 'SIGTERM', listener: () => void): void {
    this.listeners.get(signal)?.delete(listener)
  }

  emit(signal: 'SIGINT' | 'SIGTERM'): void {
    for (const listener of [...(this.listeners.get(signal) ?? [])]) {
      this.removeListener(signal, listener)
      listener()
    }
  }

  listenerCount(signal: 'SIGINT' | 'SIGTERM'): number {
    return this.listeners.get(signal)?.size ?? 0
  }
}

test.group('Notification fanout worker runtime', () => {
  for (const shutdownSignal of ['SIGINT', 'SIGTERM'] as const) {
    test(`turns ${shutdownSignal} into an AbortSignal and removes process listeners`, ({
      assert,
    }) => {
      const source = new TestSignalSource()
      const controller = new AbortController()
      const cleanup = bindNotificationFanoutShutdownSignals(controller, source)

      source.emit(shutdownSignal)
      cleanup()

      assert.isTrue(controller.signal.aborted)
      assert.equal(source.listenerCount('SIGINT'), 0)
      assert.equal(source.listenerCount('SIGTERM'), 0)
    })
  }

  test('interrupts an idle poll immediately when shutdown begins', async ({ assert }) => {
    const controller = new AbortController()
    const startedAt = Date.now()
    const waiting = waitForNotificationFanoutPoll(5_000, controller.signal)

    controller.abort()
    await waiting

    assert.isBelow(Date.now() - startedAt, 500)
  })
})
