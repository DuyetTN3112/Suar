import { test } from '@japa/runner'

import type { DomainEventOutboxShutdownSignalSource } from '#composition/command_support/domain_event_outbox_runtime'
import {
  bindDomainEventOutboxShutdownSignals,
  waitForDomainEventOutboxPoll,
} from '#composition/command_support/domain_event_outbox_runtime'
import domainEventOutboxConfig, {
  validateDomainEventOutboxWorkerConfig,
} from '#config/domain_event_outbox'

class TestSignalSource implements DomainEventOutboxShutdownSignalSource {
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

test.group('Domain event outbox worker runtime', () => {
  for (const shutdownSignal of ['SIGINT', 'SIGTERM'] as const) {
    test(`turns ${shutdownSignal} into an AbortSignal and removes process listeners`, ({
      assert,
    }) => {
      const source = new TestSignalSource()
      const controller = new AbortController()
      const cleanup = bindDomainEventOutboxShutdownSignals(controller, source)

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
    const waiting = waitForDomainEventOutboxPoll(5_000, controller.signal)

    controller.abort()
    await waiting

    assert.isBelow(Date.now() - startedAt, 500)
  })

  test('validates retry and lease relationships before worker startup', ({ assert }) => {
    const valid = { ...domainEventOutboxConfig }

    assert.throws(
      () =>
        validateDomainEventOutboxWorkerConfig({
          ...valid,
          retryBaseMs: 10_000,
          retryCapMs: 1_000,
        }),
      /DOMAIN_EVENT_OUTBOX_RETRY_CAP_MS/
    )
    assert.throws(
      () =>
        validateDomainEventOutboxWorkerConfig({
          ...valid,
          leaseDurationMs: 1_000,
          heartbeatIntervalMs: 100,
          handlerDeadlineMs: 1_000,
        }),
      /DOMAIN_EVENT_OUTBOX_HANDLER_DEADLINE_MS/
    )
    assert.throws(
      () => validateDomainEventOutboxWorkerConfig({ ...valid, maxAttempts: 0 }),
      /DOMAIN_EVENT_OUTBOX_MAX_ATTEMPTS/
    )
    assert.isTrue(Object.isFrozen(domainEventOutboxConfig))
  })
})
