import { test } from '@japa/runner'

import type {
  AccomplishmentPublicProjectionPage,
  AccomplishmentPublicProjectionReader,
} from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_public_projection_reader'
import { AccomplishmentSearchDocumentBuilder } from '#modules/accomplishments/infra/adapters/search-discovery/accomplishment_search_document_builder'
import type { AccomplishmentPublicProjectionV1 } from '#modules/accomplishments/public_contracts/publication/accomplishment_public_projection_v1'
import {
  ACCOMPLISHMENT_SEARCH_DOCUMENT_SCHEMA_V1,
  ACCOMPLISHMENT_SEARCH_TAXONOMY_VERSION_V1,
} from '#modules/accomplishments/public_contracts/accomplishment_search_document_v1'
import {
  ACCOMPLISHMENT_TEST_IDS,
  validAccomplishmentPublicProjectionV1,
} from '#modules/accomplishments/tests/backend/unit/public_contracts/verified-work/accomplishment_contract_fixtures'

/**
 * WP-20: the accomplishment search document is the only thing Search may consume.
 * These cases prove the builder exports a public-safe projection, keeps a stable
 * source identity for idempotent reindex, and cannot invent a document for an
 * accomplishment that is no longer active.
 */
class StubProjectionReader implements AccomplishmentPublicProjectionReader {
  constructor(
    private readonly projections: readonly AccomplishmentPublicProjectionV1[] = [],
    private readonly nextCursor: string | null = null
  ) {}

  findActiveById(id: string): Promise<AccomplishmentPublicProjectionV1 | null> {
    return Promise.resolve(this.projections.find((item) => item.id === id) ?? null)
  }

  listActiveForUser(input: {
    readonly userId: string
    readonly limit: number
    readonly cursor?: string
  }): Promise<AccomplishmentPublicProjectionPage> {
    return Promise.resolve({
      items: this.projections.filter((item) => item.userId === input.userId).slice(0, input.limit),
      nextCursor: this.nextCursor,
    })
  }
}

test.group('Unit | Accomplishment search document builder', () => {
  test('builds a versioned document with a stable identity for idempotent reindex', ({
    assert,
  }) => {
    const projection = validAccomplishmentPublicProjectionV1()
    const builder = new AccomplishmentSearchDocumentBuilder(new StubProjectionReader([projection]))

    const document = builder.build(projection)

    assert.equal(document.schemaVersion, ACCOMPLISHMENT_SEARCH_DOCUMENT_SCHEMA_V1)
    assert.equal(document.taxonomyVersion, ACCOMPLISHMENT_SEARCH_TAXONOMY_VERSION_V1)
    assert.equal(
      document.documentId,
      `accomplishment:v1:${projection.accomplishmentId}:publication:${projection.publicationVersion}`
    )
    assert.equal(document.sourceId, projection.id)
    assert.equal(
      document.sourceCanonicalHash,
      projection.sourceCanonicalHash,
      'the canonical hash must survive so Search can detect a genuine content change'
    )
    assert.deepEqual(builder.build(projection), document, 'building twice must be deterministic')
  })

  test('a new publication version produces a distinct document identity', ({ assert }) => {
    const first = validAccomplishmentPublicProjectionV1()
    const second = { ...first, publicationVersion: first.publicationVersion + 1 }
    const builder = new AccomplishmentSearchDocumentBuilder(new StubProjectionReader([first]))

    assert.notEqual(builder.build(first).documentId, builder.build(second).documentId)
  })

  test('never exports private disclosure, evidence or reviewer identity fields', ({ assert }) => {
    const projection = validAccomplishmentPublicProjectionV1()
    const builder = new AccomplishmentSearchDocumentBuilder(new StubProjectionReader([projection]))

    const document = builder.build(projection)
    const serialized = JSON.stringify(document)

    assert.notProperty(document, 'disclosure')
    assert.notProperty(document, 'verification')
    assert.notProperty(document, 'technology')
    assert.notInclude(
      serialized,
      projection.verification.methodLabel,
      'the internal verification method wording must not reach the search index'
    )
    for (const reviewerLabel of projection.verification.reviewerRoleLabels) {
      assert.notInclude(serialized, reviewerLabel, 'reviewer identity must never be indexed')
    }
    assert.notInclude(serialized, projection.disclosure.disclosurePolicyVersion)
  })

  test('carries only the verification facts Search is allowed to rank on', ({ assert }) => {
    const projection = validAccomplishmentPublicProjectionV1()
    const builder = new AccomplishmentSearchDocumentBuilder(new StubProjectionReader([projection]))

    const document = builder.build(projection)

    assert.equal(document.verificationStatus, projection.verification.status)
    assert.equal(document.confidenceBand, projection.verification.confidenceBand)
    assert.equal(document.provenanceClass, projection.verification.provenanceClass)
    assert.equal(document.ownershipLevel, projection.ownershipLevel)
    assert.equal(document.scaleSummary, projection.context.scaleSummary)
  })

  test('returns null for an accomplishment that is no longer active so callers must tombstone', async ({
    assert,
  }) => {
    const builder = new AccomplishmentSearchDocumentBuilder(new StubProjectionReader([]))

    const document = await builder.findById(ACCOMPLISHMENT_TEST_IDS.publicProjection)

    assert.isNull(
      document,
      'an unpublished or revoked accomplishment must not yield a search document'
    )
  })

  test('paginates a user list without losing the provider cursor', async ({ assert }) => {
    const projection = validAccomplishmentPublicProjectionV1()
    const builder = new AccomplishmentSearchDocumentBuilder(
      new StubProjectionReader([projection], 'cursor-2')
    )

    const page = await builder.listForUser({ userId: projection.userId, limit: 10 })

    assert.lengthOf(page.items, 1)
    assert.equal(page.items[0]?.sourceId, projection.id)
    assert.equal(page.nextCursor, 'cursor-2')
  })

  test('excludes another user\u2019s accomplishment from a user listing', async ({ assert }) => {
    const projection = validAccomplishmentPublicProjectionV1()
    const builder = new AccomplishmentSearchDocumentBuilder(new StubProjectionReader([projection]))

    const page = await builder.listForUser({
      userId: '00000000-0000-4000-8000-0000000000ff',
      limit: 10,
    })

    assert.lengthOf(page.items, 0)
  })
})
