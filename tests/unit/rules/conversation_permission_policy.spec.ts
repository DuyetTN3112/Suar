import { test } from '@japa/runner'
import {
  canSendMessage,
  canRecallMessage,
  canAddParticipant,
  canDeleteConversation,
} from '#actions/conversations/rules/conversation_permission_policy'
import { MessageRecallScope } from '#constants/conversation_constants'

/**
 * Tests for conversation permission policies.
 * All pure functions — no database required.
 */

// ============================================================================
// canSendMessage
// ============================================================================

test.group('canSendMessage', () => {
  test('allow: participant + org member', ({ assert }) => {
    const result = canSendMessage({
      actorId: 'user-1',
      isParticipant: true,
      isOrgMember: true,
      hasOrganization: true,
    })
    assert.isTrue(result.allowed)
  })

  test('allow: participant, no organization', ({ assert }) => {
    const result = canSendMessage({
      actorId: 'user-1',
      isParticipant: true,
      isOrgMember: false,
      hasOrganization: false,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: not a participant', ({ assert }) => {
    const result = canSendMessage({
      actorId: 'user-1',
      isParticipant: false,
      isOrgMember: true,
      hasOrganization: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })

  test('denied: participant but not org member (with organization)', ({ assert }) => {
    const result = canSendMessage({
      actorId: 'user-1',
      isParticipant: true,
      isOrgMember: false,
      hasOrganization: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })
})

// ============================================================================
// canRecallMessage
// ============================================================================

test.group('canRecallMessage', () => {
  test('allow: sender recalls with valid scope SELF', ({ assert }) => {
    const result = canRecallMessage({
      actorId: 'user-001',
      messageSenderId: 'user-001',
      isAlreadyRecalled: false,
      recallScope: MessageRecallScope.SELF,
    })
    assert.isTrue(result.allowed)
  })

  test('allow: sender recalls with valid scope ALL', ({ assert }) => {
    const result = canRecallMessage({
      actorId: 'user-001',
      messageSenderId: 'user-001',
      isAlreadyRecalled: false,
      recallScope: MessageRecallScope.ALL,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: not the sender', ({ assert }) => {
    const result = canRecallMessage({
      actorId: 'user-002',
      messageSenderId: 'user-001',
      isAlreadyRecalled: false,
      recallScope: MessageRecallScope.ALL,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })

  test('denied: already recalled', ({ assert }) => {
    const result = canRecallMessage({
      actorId: 'user-001',
      messageSenderId: 'user-001',
      isAlreadyRecalled: true,
      recallScope: MessageRecallScope.SELF,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: invalid recall scope', ({ assert }) => {
    const result = canRecallMessage({
      actorId: 'user-001',
      messageSenderId: 'user-001',
      isAlreadyRecalled: false,
      recallScope: 'invalid_scope',
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })
})

// ============================================================================
// canAddParticipant
// ============================================================================

test.group('canAddParticipant', () => {
  test('allow: participant adds new user to group', ({ assert }) => {
    const result = canAddParticipant({
      actorId: 'user-1',
      targetUserId: 'user-2',
      isActorParticipant: true,
      isTargetAlreadyParticipant: false,
      participantCount: 3,
      hasTitle: true,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: actor is not participant', ({ assert }) => {
    const result = canAddParticipant({
      actorId: 'user-1',
      targetUserId: 'user-2',
      isActorParticipant: false,
      isTargetAlreadyParticipant: false,
      participantCount: 3,
      hasTitle: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })

  test('denied: target already a participant', ({ assert }) => {
    const result = canAddParticipant({
      actorId: 'user-1',
      targetUserId: 'user-2',
      isActorParticipant: true,
      isTargetAlreadyParticipant: true,
      participantCount: 3,
      hasTitle: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: direct conversation (< 2 participants, no title)', ({ assert }) => {
    const result = canAddParticipant({
      actorId: 'user-1',
      targetUserId: 'user-2',
      isActorParticipant: true,
      isTargetAlreadyParticipant: false,
      participantCount: 1,
      hasTitle: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('allow: group with title even if < 2 participants', ({ assert }) => {
    const result = canAddParticipant({
      actorId: 'user-1',
      targetUserId: 'user-2',
      isActorParticipant: true,
      isTargetAlreadyParticipant: false,
      participantCount: 1,
      hasTitle: true,
    })
    assert.isTrue(result.allowed)
  })

  test('allow: 2+ participants without title', ({ assert }) => {
    const result = canAddParticipant({
      actorId: 'user-1',
      targetUserId: 'user-2',
      isActorParticipant: true,
      isTargetAlreadyParticipant: false,
      participantCount: 2,
      hasTitle: false,
    })
    assert.isTrue(result.allowed)
  })
})

// ============================================================================
// canDeleteConversation
// ============================================================================

test.group('canDeleteConversation', () => {
  test('allow: participant can delete', ({ assert }) => {
    const result = canDeleteConversation({ actorId: 'user-1', isParticipant: true })
    assert.isTrue(result.allowed)
  })

  test('denied: non-participant cannot delete', ({ assert }) => {
    const result = canDeleteConversation({ actorId: 'user-1', isParticipant: false })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })
})
