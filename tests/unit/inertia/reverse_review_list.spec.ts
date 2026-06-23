import { test } from '@japa/runner'

type ReverseReviewScope = 'me' | 'org' | 'admin'

interface ReverseReviewRecord {
  id: string
  review_session_id: string
  reviewer_id: string | null
  target_type: string
  target_id: string
  rating: number
  comment: string
  is_anonymous: boolean
  created_at: string
}

test.group('Reverse Review List View Model', () => {
  function resolveTargetTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      manager: 'Manager',
      peer: 'Peer',
      reviewee: 'Reviewee',
      self: 'Self',
      organization: 'Organization',
      project: 'Project',
    }
    return labels[type] ?? type
  }

  function toViewModel(review: ReverseReviewRecord, scope: ReverseReviewScope) {
    return {
      id: review.id,
      targetLabel: resolveTargetTypeLabel(review.target_type),
      targetTypeLabel: resolveTargetTypeLabel(review.target_type),
      authorLabel:
        scope === 'org' && review.is_anonymous
          ? 'Anonymous contributor'
          : review.reviewer_id ?? 'Unknown',
      submittedAtLabel: review.created_at,
    }
  }

  const sampleReview: ReverseReviewRecord = {
    id: 'rr-1',
    review_session_id: 'session-1',
    reviewer_id: 'user-1',
    target_type: 'manager',
    target_id: 'user-2',
    rating: 4,
    comment: 'Great manager',
    is_anonymous: false,
    created_at: '2026-01-01',
  }

  test('renders friendly labels instead of raw target identifiers', ({ assert }) => {
    const vm = toViewModel(sampleReview, 'me')
    assert.equal(vm.targetLabel, 'Manager')
    assert.equal(vm.targetTypeLabel, 'Manager')
  })

  test('does not expose raw target_id in view model', ({ assert }) => {
    const vm = toViewModel(sampleReview, 'me')
    assert.isFalse('target_id' in vm)
    assert.isFalse('review_session_id' in vm)
  })

  test('masks author in org scope for anonymous reviews', ({ assert }) => {
    const anonReview = { ...sampleReview, is_anonymous: true }
    const vm = toViewModel(anonReview, 'org')
    assert.equal(vm.authorLabel, 'Anonymous contributor')
  })

  test('shows author in me scope', ({ assert }) => {
    const vm = toViewModel(sampleReview, 'me')
    assert.equal(vm.authorLabel, 'user-1')
  })

  test('shows author in admin scope even for anonymous', ({ assert }) => {
    const anonReview = { ...sampleReview, is_anonymous: true }
    const vm = toViewModel(anonReview, 'admin')
    assert.equal(vm.authorLabel, 'user-1')
  })

  test('handles unknown target types gracefully', ({ assert }) => {
    const unknownReview = { ...sampleReview, target_type: 'custom_type' }
    const vm = toViewModel(unknownReview, 'me')
    assert.equal(vm.targetLabel, 'custom_type')
  })
})
