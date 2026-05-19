import { test } from '@japa/runner'

import {
  PublishAccomplishmentPublicProjectionCommand,
  PublishAccomplishmentPublicProjectionBlockedError,
  UnpublishAccomplishmentPublicProjectionCommand,
} from '#modules/accomplishments/actions/commands/publication/publish_accomplishment_public_projection_command'
import type { AccomplishmentTransactionRunner } from '#modules/accomplishments/actions/ports/outbound/accomplishment_transaction'
import type {
  AccomplishmentPublicProjectionWriter,
  CreateAccomplishmentPublicProjectionInput,
  PersistedAccomplishmentPublicProjectionResult,
  RetireActiveAccomplishmentPublicProjectionInput,
  RetiredAccomplishmentPublicProjectionResult,
} from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_public_projection_writer'
import type {
  AccomplishmentPublicationAuditEvent,
  AccomplishmentPublicationAuditWriter,
} from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_publication_audit_writer'
import type {
  AccomplishmentPublicationSearchReindexStager,
  StageAccomplishmentPublicationSearchReindexInput,
} from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_publication_search_reindex_stager'
import type { GovernedAccomplishmentPublicationSourceReader } from '#modules/accomplishments/actions/ports/outbound/publication/governed_accomplishment_publication_source_reader'
import {
  hashAccomplishmentDisclosureDecision,
  hashAccomplishmentPublicationConsent,
} from '#modules/accomplishments/domain/publication/accomplishment_public_projection_identity'
import { hashVerifiedAccomplishmentPayload } from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'
import { parseVerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import {
  ACCOMPLISHMENT_TEST_IDS,
  validVerifiedWorkAccomplishmentV1,
} from '#modules/accomplishments/tests/backend/unit/public_contracts/verified-work/accomplishment_contract_fixtures'
import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'

const hasher = new NodeAccomplishmentContentHasher()
const base = parseVerifiedWorkAccomplishmentV1(validVerifiedWorkAccomplishmentV1())
const accomplishment = {
  ...base,
  canonicalHash: hashVerifiedAccomplishmentPayload(base, hasher),
}
const decisionWithoutHash = {
  decisionId: '10000000-0000-4000-8000-000000000001',
  accomplishmentId: accomplishment.id,
  subjectUserId: accomplishment.userId,
  allowed: true,
  policyVersion: 'public-disclosure-v1',
  decidedAt: '2026-08-01T09:00:00.000Z',
  content: {
    title: accomplishment.title,
    conciseStatement: accomplishment.conciseStatement,
    taskType: accomplishment.taskType,
    businessDomain: accomplishment.businessDomain,
    problemCategory: accomplishment.problemCategory,
    role: accomplishment.role,
    autonomyLevel: accomplishment.autonomyLevel,
    collaborationType: accomplishment.collaborationType,
    environment: accomplishment.context.environment,
    systemArea: accomplishment.context.systemArea,
    scaleSummary: accomplishment.context.scaleSummary,
    deliverableSummaries: ['OpenAPI specification'],
    outcomeSummaries: ['All acceptance and idempotency scenarios passed.'],
    technology: ['AdonisJS', 'PostgreSQL'],
    capabilities: [
      {
        capabilityId: ACCOMPLISHMENT_TEST_IDS.capability,
        label: 'API design',
        confidenceBand: 'high' as const,
      },
    ],
    verificationMethodLabel: 'Design and code review',
    reviewerRoleLabels: ['Backend Lead'],
    evidenceAvailability: 'not_disclosed' as const,
    redactionState: 'generalized' as const,
    organizationLabel: null,
    projectLabel: null,
  },
}
const decision = {
  ...decisionWithoutHash,
  decisionHash: hashAccomplishmentDisclosureDecision(decisionWithoutHash, hasher),
}
const consentWithoutHash = {
  consentFactId: '10000000-0000-4000-8000-000000000003',
  accomplishmentId: accomplishment.id,
  subjectUserId: accomplishment.userId,
  granted: true,
  sourceCanonicalHash: accomplishment.canonicalHash,
  sourceLifecycleRevisionId: ACCOMPLISHMENT_TEST_IDS.lifecycleRevision,
  disclosureDecisionId: decision.decisionId,
  disclosureDecisionHash: decision.decisionHash,
  disclosurePolicyVersion: decision.policyVersion,
  consentedAt: '2026-08-01T10:00:00.000Z',
}
const publicationConsent = {
  ...consentWithoutHash,
  consentFactHash: hashAccomplishmentPublicationConsent(consentWithoutHash, hasher),
}
const source = {
  accomplishment,
  lifecycleRevisionId: ACCOMPLISHMENT_TEST_IDS.lifecycleRevision,
  lifecycleState: 'verified' as const,
  hasOpenDispute: false,
  disclosureDecision: decision,
  publicationConsent,
  allowedCapabilities: decision.content.capabilities,
}

function publishInput(overrides: Record<string, unknown> = {}) {
  return {
    accomplishmentId: accomplishment.id,
    actorUserId: accomplishment.userId,
    idempotencyKey: 'publish-approved-summary',
    expectedSourceCanonicalHash: accomplishment.canonicalHash,
    expectedLifecycleRevisionId: ACCOMPLISHMENT_TEST_IDS.lifecycleRevision,
    expectedDisclosureDecisionHash: decision.decisionHash,
    expectedDisclosurePolicyVersion: decision.policyVersion,
    consentFactId: publicationConsent.consentFactId,
    consentFactHash: publicationConsent.consentFactHash,
    auditContext: {
      userId: accomplishment.userId,
      ip: '127.0.0.1',
      userAgent: 'focused-test',
      organizationId: accomplishment.organizationId,
      actorRoleSurface: 'creator',
      requestId: 'request-publication-test',
      traceId: 'trace-publication-test',
    },
    ...overrides,
  }
}

class AuditWriter implements AccomplishmentPublicationAuditWriter {
  events: AccomplishmentPublicationAuditEvent[] = []
  contexts: AuditActionContext[] = []

  record(event: AccomplishmentPublicationAuditEvent, execCtx: AuditActionContext) {
    this.events.push(event)
    this.contexts.push(execCtx)
    return Promise.resolve()
  }
}

class SourceReader implements GovernedAccomplishmentPublicationSourceReader {
  constructor(private readonly value = source) {}

  loadForPublication(accomplishmentId: string) {
    return Promise.resolve(
      accomplishmentId === this.value.accomplishment.id ? this.value : null
    )
  }
}

class Writer implements AccomplishmentPublicProjectionWriter {
  lastPublish: CreateAccomplishmentPublicProjectionInput | null = null
  lastRetire: RetireActiveAccomplishmentPublicProjectionInput | null = null

  publish(
    input: CreateAccomplishmentPublicProjectionInput
  ): Promise<PersistedAccomplishmentPublicProjectionResult> {
    this.lastPublish = input
    return Promise.resolve({
      inserted: true,
      projection: { ...input.projection, publicationVersion: 1 },
    })
  }

  retireActive(
    input: RetireActiveAccomplishmentPublicProjectionInput
  ): Promise<RetiredAccomplishmentPublicProjectionResult> {
    this.lastRetire = input
    return Promise.resolve({
      changed: true,
      projectionId: '10000000-0000-4000-8000-000000000099',
      publicationVersion: 1,
      retiredAt: input.retiredAt,
    })
  }
}

test.group('Unit | Publish accomplishment public projection command', () => {
  test('uses authoritative wording, canonical semantics and returns a recruiter-safe DTO', async ({
    assert,
  }) => {
    const writer = new Writer()
    const audit = new AuditWriter()
    const result = await new PublishAccomplishmentPublicProjectionCommand({
      sources: new SourceReader(),
      writer,
      hasher,
      auditWriter: audit,
    }).execute(publishInput())

    assert.equal(writer.lastPublish?.projection.action, accomplishment.action)
    assert.equal(writer.lastPublish?.projection.object, accomplishment.object)
    assert.equal(writer.lastPublish?.projection.ownershipLevel, accomplishment.ownershipLevel)
    assert.equal(result.projection.title, decision.content.title)
    assert.notProperty(result.projection, 'accomplishmentId')
    assert.notProperty(result.projection, 'userId')
    assert.notProperty(result.projection, 'sourceLifecycleRevisionId')
    assert.notProperty(result.projection, 'sourceCanonicalHash')

    const serialized = JSON.stringify(result.projection)
    const reviewer = accomplishment.verification.reviewerReferences[0]
    const evidence = accomplishment.evidenceReferences[0]
    if (!reviewer || !evidence) throw new Error('fixture requires reviewer and evidence')
    assert.notInclude(serialized, accomplishment.taskId)
    assert.notInclude(serialized, accomplishment.organizationId as string)
    assert.notInclude(serialized, reviewer.reviewerId)
    assert.notInclude(serialized, evidence.evidenceId)
    assert.notInclude(serialized, evidence.contentHash as string)
    assert.deepEqual(audit.events, [
      {
        action: 'publish',
        accomplishmentId: accomplishment.id,
        actorUserId: accomplishment.userId,
        projectionId: result.projection.id,
        publicationVersion: 1,
        insertedOrChanged: true,
        sourceCanonicalHash: accomplishment.canonicalHash,
        lifecycleRevisionId: ACCOMPLISHMENT_TEST_IDS.lifecycleRevision,
        disclosurePolicyVersion: decision.policyVersion,
      },
    ])
    assert.notProperty(audit.events[0], 'title')
    assert.equal(audit.contexts[0]?.requestId, 'request-publication-test')
  })

  test('stages publication Search reindex atomically with the projection transaction', async ({
    assert,
  }) => {
    const stages: StageAccomplishmentPublicationSearchReindexInput[] = []
    const transaction = { marker: 'publication-transaction' }
    const stager: AccomplishmentPublicationSearchReindexStager = {
      stage: (received, input) => {
        assert.equal(received, transaction)
        stages.push(input)
        return Promise.resolve()
      },
    }
    const transactions: AccomplishmentTransactionRunner = {
      run: (work) => work(transaction),
    }

    const result = await new PublishAccomplishmentPublicProjectionCommand({
      sources: new SourceReader(),
      writer: new Writer(),
      hasher,
      auditWriter: new AuditWriter(),
      transactions,
      searchReindexStager: stager,
    }).execute(publishInput({ idempotencyKey: 'publish-search-reindex' }))

    assert.deepEqual(stages, [
      {
        userId: accomplishment.userId,
        projectionId: result.projection.id,
        publicationVersion: 1,
        operation: 'published',
        sourceEventId: result.projection.id,
      },
    ])

    stages.length = 0
    const replayWriter = new Writer()
    replayWriter.publish = (input) =>
      Promise.resolve({
        inserted: false,
        projection: { ...input.projection, publicationVersion: 1 },
      })
    await new PublishAccomplishmentPublicProjectionCommand({
      sources: new SourceReader(),
      writer: replayWriter,
      hasher,
      auditWriter: new AuditWriter(),
      transactions,
      searchReindexStager: stager,
    }).execute(publishInput({ idempotencyKey: 'publish-search-reindex-replay' }))
    assert.deepEqual(stages, [])
  })

  test('fails closed for forged canonical or disclosure hashes', async ({ assert }) => {
    const forgedCanonical = {
      ...source,
      accomplishment: { ...accomplishment, canonicalHash: `sha256:${'f'.repeat(64)}` as const },
    }
    await assert.rejects(
      () =>
        new PublishAccomplishmentPublicProjectionCommand({
          sources: new SourceReader(forgedCanonical),
          writer: new Writer(),
          hasher,
          auditWriter: new AuditWriter(),
        }).execute(publishInput({ idempotencyKey: 'publish-forged' })),
      PublishAccomplishmentPublicProjectionBlockedError
    )

    const forgedDecision = {
      ...source,
      disclosureDecision: { ...decision, decisionHash: `sha256:${'e'.repeat(64)}` as const },
    }
    await assert.rejects(
      () =>
        new PublishAccomplishmentPublicProjectionCommand({
          sources: new SourceReader(forgedDecision),
          writer: new Writer(),
          hasher,
          auditWriter: new AuditWriter(),
        }).execute(publishInput({ idempotencyKey: 'publish-forged-decision' })),
      PublishAccomplishmentPublicProjectionBlockedError
    )
  })

  test('blocks non-owner publication and missing consent before persistence', async ({ assert }) => {
    const writer = new Writer()
    const command = new PublishAccomplishmentPublicProjectionCommand({
      sources: new SourceReader(),
      writer,
      hasher,
      auditWriter: new AuditWriter(),
    })

    await assert.rejects(
      () =>
        command.execute(publishInput({
          actorUserId: '10000000-0000-4000-8000-000000000099',
          idempotencyKey: 'foreign-publish',
        })),
      PublishAccomplishmentPublicProjectionBlockedError
    )
    await assert.rejects(
      () =>
        command.execute(publishInput({
          idempotencyKey: 'no-consent',
          consentFactId: '10000000-0000-4000-8000-000000000099',
        })),
      PublishAccomplishmentPublicProjectionBlockedError
    )
    assert.isNull(writer.lastPublish)
  })

  test('unpublish requires the owner confirmation and retires rather than deleting', async ({
    assert,
  }) => {
    const writer = new Writer()
    const audit = new AuditWriter()
    const result = await new UnpublishAccomplishmentPublicProjectionCommand({
      sources: new SourceReader(),
      writer,
      auditWriter: audit,
    }).execute({
      accomplishmentId: accomplishment.id,
      actorUserId: accomplishment.userId,
      projectionId: '10000000-0000-4000-8000-000000000099',
      publicationVersion: 1,
      confirmed: true,
      retiredAt: '2026-08-02T10:00:00.000Z',
      auditContext: {
        userId: accomplishment.userId,
        ip: '127.0.0.1',
        userAgent: 'focused-test',
        organizationId: accomplishment.organizationId,
        requestId: 'request-unpublish-test',
        traceId: 'trace-unpublish-test',
      },
    })

    assert.isTrue(result.changed)
    assert.equal(writer.lastRetire?.accomplishmentId, accomplishment.id)
    assert.equal(result.publicationVersion, 1)
    assert.deepEqual(audit.events, [
      {
        action: 'unpublish',
        accomplishmentId: accomplishment.id,
        actorUserId: accomplishment.userId,
        projectionId: '10000000-0000-4000-8000-000000000099',
        publicationVersion: 1,
        insertedOrChanged: true,
        sourceCanonicalHash: null,
        lifecycleRevisionId: null,
        disclosurePolicyVersion: null,
      },
    ])
  })
})
