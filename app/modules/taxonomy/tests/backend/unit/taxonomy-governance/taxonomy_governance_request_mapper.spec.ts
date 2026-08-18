import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildTaxonomyGovernanceApplyRequest,
  buildTaxonomyGovernancePreviewRequest,
  buildTaxonomyGovernanceStatusRequest,
} from '#modules/taxonomy/controllers/mappers/request/taxonomy-governance/taxonomy_governance_request_mapper'

const preview = {
  namespace: 'skills',
  expectedVersion: 2,
  changes: [{ kind: 'rename', from: { namespace: 'skills', termId: 'old' }, to: { namespace: 'skills', termId: 'new' } }],
}

test.group('Taxonomy governance request mapper', () => {
  test('maps preview, status, and apply requests', ({ assert }) => {
    assert.equal(buildTaxonomyGovernancePreviewRequest({ ...preview, namespace: ' skills ' }).namespace, 'skills')
    assert.deepEqual(buildTaxonomyGovernanceStatusRequest({ planToken: ' plan-1 ' }), { planToken: 'plan-1' })
    assert.deepEqual(
      buildTaxonomyGovernanceApplyRequest(
        { planToken: ' plan-1 ' },
        { expectedLockVersion: 1, publishedVersion: 3, items: [{ id: 'i1', source: 'old' }], limit: 10 }
      ),
      { planToken: 'plan-1', expectedLockVersion: 1, publishedVersion: 3, items: [{ id: 'i1', source: 'old' }], limit: 10 }
    )
  })

  test('rejects coercion, invalid versions, and malformed changes', ({ assert }) => {
    assert.throws(() => buildTaxonomyGovernancePreviewRequest({ ...preview, expectedVersion: '2' }), ValidationException)
    assert.throws(() => buildTaxonomyGovernancePreviewRequest({ ...preview, changes: [{ kind: 'unknown' }] }), ValidationException)
    assert.throws(() => buildTaxonomyGovernanceStatusRequest({ planToken: 42 }), ValidationException)
    assert.throws(() => buildTaxonomyGovernanceApplyRequest({}, { expectedLockVersion: 1, publishedVersion: 1, items: [], limit: 1 }), ValidationException)
  })
})
