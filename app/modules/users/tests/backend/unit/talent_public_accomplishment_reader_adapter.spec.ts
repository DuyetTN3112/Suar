import { test } from '@japa/runner'

import { TalentPublicAccomplishmentReaderAdapter } from '#composition/adapters/accomplishments/publication/talent_public_accomplishment_reader_adapter'
import type { AccomplishmentPublicProjectionReader } from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_public_projection_reader'
import { validAccomplishmentPublicProjectionV1 } from '#modules/accomplishments/tests/backend/unit/public_contracts/verified-work/accomplishment_contract_fixtures'

test.group('Unit | Talent public accomplishment reader adapter', () => {
  test('projects active accomplishments into provider-neutral public talent vocabulary', async ({
    assert,
  }) => {
    const projection = validAccomplishmentPublicProjectionV1()
    const reader: AccomplishmentPublicProjectionReader = {
      findActiveById: async () => projection,
      listActiveForUser: async () => ({ items: [projection], nextCursor: null }),
    }

    const result = await new TalentPublicAccomplishmentReaderAdapter(reader).listForUser(
      projection.userId
    )

    assert.lengthOf(result, 1)
    assert.equal(result[0]?.title, projection.title)
    assert.deepEqual(result[0]?.technology, projection.technology)
    assert.deepEqual(
      result[0]?.capabilityLabels,
      projection.capabilities.map((capability) => capability.label)
    )
    assert.notProperty(result[0], 'verification')
    assert.notProperty(result[0], 'disclosure')
  })
})
