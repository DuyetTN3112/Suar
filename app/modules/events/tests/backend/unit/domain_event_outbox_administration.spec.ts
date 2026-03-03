import { createHash, randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import type { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import {
  DOMAIN_EVENT_DLQ_SERVICE_PRINCIPAL_ENV_KEY,
  resolveDomainEventDlqServicePrincipal,
} from '#modules/authorization/public_contracts/trusted_service_principal'
import { ReplayDomainEventDeadLettersCommand } from '#modules/events/actions/commands/replay_domain_event_dead_letters_command'
import type { DomainEventOutboxAdministrationAuditWriter } from '#modules/events/actions/dtos/domain_event_outbox_administration'
import type { DomainEventOutboxAdministrationRepository,
  DomainEventOutboxAdministrationEvidenceGenerator,
  DomainEventOutboxAdministrationTransactionExecutor } from '#modules/events/actions/ports/outbound/domain_event_outbox_administration_ports'
import { PreviewDomainEventDeadLettersQuery } from '#modules/events/actions/queries/preview_domain_event_dead_letters_query'
import type { DomainEventOutboxReplayInput } from '#modules/events/domain/domain_event_outbox_administration'
import {
  requireBoundedDomainEventOutboxAdminSelector,
  validateDomainEventOutboxPreviewInput,
} from '#modules/events/domain/domain_event_outbox_administration'

const NOW = new Date('2030-07-26T00:00:00.000Z')

function executeWithFakeTransaction<T>(callback: (trx: object) => Promise<T>): Promise<T> {
  return callback({})
}

function makeRepository(
  overrides: Partial<DomainEventOutboxAdministrationRepository> = {}
): DomainEventOutboxAdministrationRepository {
  return {
    status: () =>
      Promise.resolve({
        observedAt: NOW,
        countCap: 10_000,
        duePending: 0,
        duePendingCountCapped: false,
        futureBackoffPending: 0,
        futureBackoffPendingCountCapped: false,
        activeLeases: 0,
        activeLeaseCountCapped: false,
        expiredLeases: 0,
        expiredLeaseCountCapped: false,
        deadLetter: 0,
        deadLetterCountCapped: false,
        oldestDuePendingAgeMs: null,
        nextBackoffDueInMs: null,
        nextActiveLeaseExpiryInMs: null,
        oldestExpiredLeaseAgeMs: null,
        oldestDeadLetterAgeMs: null,
      }),
    previewDeadLetters: () =>
      Promise.resolve({
        items: [],
        hasMore: false,
        nextAfterSequence: null,
      }),
    replayDeadLetters: () =>
      Promise.resolve({
        rows: [],
        matchedCount: 0,
        deferredCount: 0,
        hasMoreOrLocked: false,
      }),
    ...overrides,
  }
}

function makeUseCases(
  repository: DomainEventOutboxAdministrationRepository = makeRepository(),
  dependencies: {
    auditWriter?: DomainEventOutboxAdministrationAuditWriter
    transactionExecutor?: DomainEventOutboxAdministrationTransactionExecutor
    evidenceGenerator?: DomainEventOutboxAdministrationEvidenceGenerator
  } = {}
) {
  const evidenceGenerator = dependencies.evidenceGenerator ?? {
    newOperationId: randomUUID,
    digest: (value: string) => createHash('sha256').update(value).digest('hex'),
  }
  const transactionExecutor = dependencies.transactionExecutor ?? {
    run: executeWithFakeTransaction,
  }

  return {
    previewQuery: new PreviewDomainEventDeadLettersQuery(repository, {
      evidenceGenerator,
      ...(dependencies.auditWriter ? { auditWriter: dependencies.auditWriter } : {}),
    }),
    replayCommand: new ReplayDomainEventDeadLettersCommand(repository, {
      evidenceGenerator,
      transactionExecutor,
      ...(dependencies.auditWriter ? { auditWriter: dependencies.auditWriter } : {}),
    }),
  }
}

async function executionContext(actorId = randomUUID()) {
  const operatorIdentity = await resolveDomainEventDlqServicePrincipal(actorId, {
    findPrincipal: () =>
      Promise.resolve({
        id: actorId,
        systemRole: 'system_admin',
        status: 'active',
      }),
    hasPermission: () => Promise.resolve(true),
  })
  return {
    userId: actorId,
    ip: '0.0.0.0',
    userAgent: 'unit-test',
    organizationId: null,
    actorRoleSurface: 'system_admin',
    operatorIdentity,
  }
}

function captureAuditWrites() {
  const records: unknown[] = []
  return {
    records,
    writer: {
      write: (...args: Parameters<typeof auditPublicApi.write>) => {
        records.push(args[1])
        return Promise.resolve()
      },
    },
  }
}

test.group('Domain event outbox administration', () => {
  test('requires a bounded exact replay selector and bounded preview page', ({ assert }) => {
    assert.throws(
      () => requireBoundedDomainEventOutboxAdminSelector({}),
      /requires an exact id, eventName, or dedupeKey filter/
    )
    assert.throws(
      () =>
        validateDomainEventOutboxPreviewInput({
          selector: {},
          limit: 101,
        }),
      /preview limit must be between 1 and 100/
    )
    assert.deepEqual(
      requireBoundedDomainEventOutboxAdminSelector({
        eventName: 'task:assignment:completed',
      }),
      { eventName: 'task:assignment:completed' }
    )
    assert.deepEqual(
      requireBoundedDomainEventOutboxAdminSelector({
        eventName: 'review:submitted',
      }),
      { eventName: 'review:submitted' }
    )
    assert.deepEqual(
      requireBoundedDomainEventOutboxAdminSelector({
        eventName: 'review:confirmed',
      }),
      { eventName: 'review:confirmed' }
    )
    assert.deepEqual(
      requireBoundedDomainEventOutboxAdminSelector({
        eventName: 'dispute:resolved',
      }),
      { eventName: 'dispute:resolved' }
    )
    assert.deepEqual(
      requireBoundedDomainEventOutboxAdminSelector({
        eventName: 'reviews:talent-explainability-projection:changed:v1',
      }),
      { eventName: 'reviews:talent-explainability-projection:changed:v1' }
    )
    assert.deepEqual(
      requireBoundedDomainEventOutboxAdminSelector({
        eventName: 'search:talent-reindex-requested',
      }),
      { eventName: 'search:talent-reindex-requested' }
    )
  })

  test('audits preview counters and selector digests without raw dedupe keys or payloads', async ({
    assert,
  }) => {
    const id = randomUUID()
    const dedupeKey = `sensitive-dedupe:${randomUUID()}`
    const payloadSecret = 'payload-must-never-be-audited'
    const audit = captureAuditWrites()
    const useCases = makeUseCases(
      makeRepository({
        previewDeadLetters: () =>
          Promise.resolve({
            items: [
              {
                id,
                sequence: 17,
                eventName: 'task:assignment:completed',
                dedupeKey,
                aggregateType: 'task_assignment',
                aggregateId: randomUUID(),
                attemptCount: 10,
                lifetimeAttemptCount: 24,
                replayCount: 2,
                errorCode: 'SUBSCRIBER_REJECTED',
                deadLetteredAt: NOW,
              },
            ],
            hasMore: false,
            nextAfterSequence: null,
          }),
      }),
      { auditWriter: audit.writer }
    )

    const page = await useCases.previewQuery.execute(
      {
        selector: { dedupeKey },
        limit: 25,
      },
      await executionContext()
    )

    assert.equal(page.items[0]?.id, id)
    const serializedAudit = JSON.stringify(audit.records)
    assert.notInclude(serializedAudit, dedupeKey)
    assert.notInclude(serializedAudit, payloadSecret)
    assert.include(serializedAudit, '"returnedCount":1')
    assert.include(serializedAudit, '"exactDedupeKey":true')
  })

  test('replays atomically with confirmation and preserves attempt history metadata', async ({
    assert,
  }) => {
    const actorId = randomUUID()
    const rowId = randomUUID()
    const reason = 'Replay after the subscriber schema was repaired'
    let replayInput: DomainEventOutboxReplayInput | undefined
    const audit = captureAuditWrites()
    const useCases = makeUseCases(
      makeRepository({
        replayDeadLetters: (input) => {
          replayInput = input
          return Promise.resolve({
            rows: [
              {
                id: rowId,
                sequence: 21,
                eventName: 'task:assignment:completed',
                previousAttemptCount: 10,
                lifetimeAttemptCount: 24,
                replayCount: 3,
                previousStatus: 'dead_letter',
              },
            ],
            matchedCount: 1,
            deferredCount: 0,
            hasMoreOrLocked: false,
          })
        },
      }),
      {
        auditWriter: audit.writer,
        transactionExecutor: {
          run: executeWithFakeTransaction,
        },
      }
    )

    const result = await useCases.replayCommand.execute(
      {
        selector: { id: rowId },
        reason,
        confirmation: 'REPLAY',
        now: NOW,
      },
      await executionContext(actorId)
    )

    assert.deepEqual(
      {
        affectedCount: result.affectedCount,
        matchedCount: result.matchedCount,
        deferredCount: result.deferredCount,
        hasMoreOrLocked: result.hasMoreOrLocked,
      },
      {
        affectedCount: 1,
        matchedCount: 1,
        deferredCount: 0,
        hasMoreOrLocked: false,
      }
    )
    assert.equal(replayInput?.actorId, actorId)
    assert.equal(replayInput?.reasonLength, reason.length)
    assert.match(replayInput?.reasonDigest ?? '', /^[0-9a-f]{64}$/u)
    assert.notInclude(JSON.stringify(replayInput), reason)
    const serializedAudit = JSON.stringify(audit.records)
    assert.notInclude(serializedAudit, reason)
    assert.include(serializedAudit, '"previousAttemptCountTotal":10')
    assert.include(serializedAudit, '"lifetimeAttemptCountTotal":24')
    assert.include(serializedAudit, '"actor_type":"service"')
    assert.include(serializedAudit, '"authenticationProvenance":"runtime_environment"')
    assert.include(
      serializedAudit,
      `"principalConfigurationKey":"${DOMAIN_EVENT_DLQ_SERVICE_PRINCIPAL_ENV_KEY}"`
    )
  })

  test('surfaces locked selections without applying a partial replay', async ({ assert }) => {
    const audit = captureAuditWrites()
    const useCases = makeUseCases(
      makeRepository({
        replayDeadLetters: () =>
          Promise.resolve({
            rows: [],
            matchedCount: 2,
            deferredCount: 1,
            hasMoreOrLocked: true,
          }),
      }),
      {
        auditWriter: audit.writer,
        transactionExecutor: {
          run: executeWithFakeTransaction,
        },
      }
    )

    const result = await useCases.replayCommand.execute(
      {
        selector: { eventName: 'task:assignment:completed' },
        reason: 'Retry after concurrent operator maintenance',
        confirmation: 'REPLAY',
        now: NOW,
      },
      await executionContext()
    )

    assert.isTrue(result.hasMoreOrLocked)
    assert.equal(result.affectedCount, 0)
    assert.equal(result.deferredCount, 1)
    assert.include(JSON.stringify(audit.records), '"outcome":"warning"')
  })

  test('rejects mutation without exact confirmation before entering a transaction', async ({
    assert,
  }) => {
    let transactionEntered = false
    const execCtx = await executionContext()
    const useCases = makeUseCases(makeRepository(), {
      transactionExecutor: {
        run: () => {
          transactionEntered = true
          return Promise.reject(new Error('must not run'))
        },
      },
    })

    await assert.rejects(
      () =>
        useCases.replayCommand.execute(
          {
            selector: { id: randomUUID() },
            reason: 'A sufficiently detailed replay justification',
            confirmation: 'replay',
          },
          execCtx
        ),
      /requires confirmation=REPLAY/
    )
    assert.isFalse(transactionEntered)
  })

  test('rejects a caller-forged operator identity before repository access', async ({ assert }) => {
    let repositoryAccessed = false
    const actorId = randomUUID()
    const useCases = makeUseCases(
      makeRepository({
        previewDeadLetters: () => {
          repositoryAccessed = true
          return Promise.resolve({ items: [], hasMore: false, nextAfterSequence: null })
        },
      })
    )

    await assert.rejects(
      () =>
        useCases.previewQuery.execute(
          { selector: {}, limit: 25 },
          {
            userId: actorId,
            ip: '0.0.0.0',
            userAgent: 'spoofed-cli',
            organizationId: null,
            actorRoleSurface: 'superadmin',
            operatorIdentity: {
              actorId,
              actorRoleSurface: 'superadmin',
              actorType: 'service',
              authenticationProvenance: 'runtime_environment',
              configurationKey: DOMAIN_EVENT_DLQ_SERVICE_PRINCIPAL_ENV_KEY,
            },
          }
        ),
      /trusted service-principal binding is required/
    )
    assert.isFalse(repositoryAccessed)
  })

  test('rejects a trusted identity when the audit actor id does not match its binding', async ({
    assert,
  }) => {
    const execCtx = await executionContext()
    const useCases = makeUseCases(makeRepository())

    await assert.rejects(
      () =>
        useCases.previewQuery.execute(
          { selector: {}, limit: 25 },
          {
            ...execCtx,
            userId: randomUUID(),
          }
        ),
      /trusted service-principal binding is required/
    )
  })

  test('fails closed when service-principal config is missing or unauthorized', async ({
    assert,
  }) => {
    const actorId = randomUUID()

    await assert.rejects(
      () =>
        resolveDomainEventDlqServicePrincipal(undefined, {
          findPrincipal: () => Promise.resolve(null),
          hasPermission: () => Promise.resolve(false),
        }),
      new RegExp(DOMAIN_EVENT_DLQ_SERVICE_PRINCIPAL_ENV_KEY)
    )
    await assert.rejects(
      () =>
        resolveDomainEventDlqServicePrincipal(actorId, {
          findPrincipal: () =>
            Promise.resolve({
              id: actorId,
              systemRole: 'registered_user',
              status: 'active',
            }),
          hasPermission: () => Promise.resolve(false),
        }),
      /inactive or unauthorized/
    )
  })
})
