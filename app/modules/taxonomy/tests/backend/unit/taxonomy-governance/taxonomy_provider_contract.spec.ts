import { test } from '@japa/runner'

import {
  TaxonomyCursorError,
  TaxonomyProviderUnavailableError,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_provider'

test.group('Taxonomy provider contract', () => {
  test('exposes a stable retryable provider-unavailable error without term details', ({
    assert,
  }) => {
    const error = new TaxonomyProviderUnavailableError('organization.private-vocabulary')

    assert.equal(error.code, 'E_TAXONOMY_PROVIDER_UNAVAILABLE')
    assert.equal(error.message, 'Taxonomy metadata is temporarily unavailable')
    assert.equal(error.namespace, 'organization.private-vocabulary')
    assert.isTrue(error.retryable)
    assert.notInclude(error.message, 'organization.private-vocabulary')
  })

  test('exposes stable non-retryable invalid and stale cursor errors', ({ assert }) => {
    const invalid = new TaxonomyCursorError('invalid')
    const stale = new TaxonomyCursorError('stale')

    assert.equal(invalid.code, 'E_TAXONOMY_CURSOR_INVALID')
    assert.equal(invalid.message, 'Taxonomy cursor is invalid')
    assert.equal(invalid.reason, 'invalid')
    assert.isFalse(invalid.retryable)
    assert.equal(stale.code, 'E_TAXONOMY_CURSOR_STALE')
    assert.equal(stale.message, 'Taxonomy cursor is stale')
    assert.equal(stale.reason, 'stale')
    assert.isFalse(stale.retryable)
  })
})
