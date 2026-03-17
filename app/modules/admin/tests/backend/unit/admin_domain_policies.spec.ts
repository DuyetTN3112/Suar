import { test } from '@japa/runner'

import { validateSubscriptionAdministrationInput } from '#modules/admin/packages/domain/subscription_administration_policy'
import { decideFlaggedReviewResolution } from '#modules/admin/reviews/domain/review_moderation_policy'
import {
  decideAccountStatusChange,
  decideSystemRoleChange,
} from '#modules/admin/users/domain/user_administration_policy'

test.group('Admin domain policies', () => {
  test('keeps self-target and superadmin mutation rules in the domain', ({ assert }) => {
    assert.deepEqual(
      decideSystemRoleChange({
        actorId: 'same-user',
        actorSystemRole: 'superadmin',
        targetUserId: 'same-user',
        requestedSystemRole: 'registered_user',
      }),
      { allowed: false, reason: 'self_role_change_forbidden' }
    )
    assert.deepEqual(
      decideAccountStatusChange({
        actorId: 'system-admin',
        actorSystemRole: 'system_admin',
        targetUserId: 'superadmin',
        targetSystemRole: 'superadmin',
      }),
      {
        allowed: false,
        reason: 'superadmin_status_change_requires_superadmin',
      }
    )
  })

  test('normalizes moderation notes and requires a pending review', ({ assert }) => {
    assert.deepEqual(
      decideFlaggedReviewResolution({
        notes: '  reviewed evidence  ',
        status: 'pending',
      }),
      { allowed: true, normalizedNotes: 'reviewed evidence' }
    )
    assert.deepEqual(
      decideFlaggedReviewResolution({
        notes: 'reviewed evidence',
        status: 'resolved',
      }),
      { allowed: false, reason: 'flagged_review_already_resolved' }
    )
  })

  test('owns supported subscription administration inputs', ({ assert }) => {
    assert.deepEqual(
      validateSubscriptionAdministrationInput({
        plan: 'promax',
        status: 'active',
      }),
      { valid: true }
    )
    assert.deepEqual(
      validateSubscriptionAdministrationInput({ plan: 'unknown' }),
      { valid: false, field: 'plan' }
    )
  })
})
