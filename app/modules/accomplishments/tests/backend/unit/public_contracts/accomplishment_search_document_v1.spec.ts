import { test } from '@japa/runner'

import {
  isAccomplishmentSearchDocumentV1,
  parseAccomplishmentSearchDocumentV1,
} from '#modules/accomplishments/public_contracts/accomplishment_search_document_v1'
import { validAccomplishmentPublicProjectionV1 } from '#modules/accomplishments/tests/backend/unit/public_contracts/verified-work/accomplishment_contract_fixtures'
import { AccomplishmentSearchDocumentBuilder } from '#modules/accomplishments/infra/adapters/search-discovery/accomplishment_search_document_builder'
import type { AccomplishmentPublicProjectionReader } from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_public_projection_reader'

test.group('Accomplishment search document | public-safe V1', () => {
  const projection = validAccomplishmentPublicProjectionV1()
  const reader: AccomplishmentPublicProjectionReader = {
    async findActiveById() {
      return projection
    },
    async listActiveForUser() {
      return { items: [projection], nextCursor: null }
    },
  }

  test('maps only published allowlisted fields and carries stable source/version metadata', async ({
    assert,
  }) => {
    const builder = new AccomplishmentSearchDocumentBuilder(reader)
    const document = builder.build(projection)

    assert.isTrue(isAccomplishmentSearchDocumentV1(document))
    assert.equal(document.documentId, `accomplishment:v1:${projection.accomplishmentId}:publication:1`)
    assert.equal(document.sourceId, projection.id)
    assert.equal(document.taxonomyVersion, 'accomplishment-taxonomy-v1')
    assert.equal(document.action, projection.action)
    assert.equal(document.object, projection.object)
    assert.equal(document.scaleSummary, projection.context.scaleSummary)
    assert.equal(document.verificationStatus, 'verified')
    assert.notProperty(document, 'organizationId')
    assert.notProperty(document, 'evidenceReferences')
    assert.notProperty(document, 'disclosure')

    const found = await builder.findById(projection.id)
    assert.deepEqual(found, document)
    const page = await builder.listForUser({ userId: projection.userId, limit: 10 })
    assert.deepEqual(page.items, [document])
  })

  test('rejects forged provider/private fields instead of widening the bridge contract', ({
    assert,
  }) => {
    const document = new AccomplishmentSearchDocumentBuilder(reader).build(projection)
    assert.throws(() =>
      parseAccomplishmentSearchDocumentV1({
        ...document,
        evidenceReferences: [{ url: 'https://private.example/evidence' }],
      })
    )
  })
})
