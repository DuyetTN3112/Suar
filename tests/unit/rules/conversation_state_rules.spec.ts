import { test } from '@japa/runner'
import {
  detectConversationType,
  checkDirectConversationDuplicate,
  checkGroupConversationDuplicate,
  validateRecallScope,
  validateParticipantsOrgMembership,
} from '#domain/conversations/conversation_state_rules'
import { MessageRecallScope } from '#constants/conversation_constants'

/**
 * Tests for conversation state rules.
 * All pure functions — no database required.
 */

// ============================================================================
// detectConversationType
// ============================================================================

test.group('detectConversationType', () => {
  test('direct: exactly 2 participants, no title', ({ assert }) => {
    const result = detectConversationType(2, false)
    assert.isTrue(result.isDirect)
    assert.isFalse(result.isGroup)
  })

  test('group: 3+ participants, no title', ({ assert }) => {
    const result = detectConversationType(3, false)
    assert.isFalse(result.isDirect)
    assert.isTrue(result.isGroup)
  })

  test('group: 2 participants with title', ({ assert }) => {
    const result = detectConversationType(2, true)
    assert.isFalse(result.isDirect)
    assert.isTrue(result.isGroup)
  })

  test('group: 1 participant with title', ({ assert }) => {
    const result = detectConversationType(1, true)
    assert.isFalse(result.isDirect)
    assert.isTrue(result.isGroup)
  })

  test('not direct: 1 participant, no title', ({ assert }) => {
    const result = detectConversationType(1, false)
    assert.isFalse(result.isDirect)
    assert.isTrue(result.isGroup)
  })

  test('group: 5 participants with title', ({ assert }) => {
    const result = detectConversationType(5, true)
    assert.isFalse(result.isDirect)
    assert.isTrue(result.isGroup)
  })
})

// ============================================================================
// checkDirectConversationDuplicate
// ============================================================================

test.group('checkDirectConversationDuplicate', () => {
  test('allow: no existing conversation', ({ assert }) => {
    const result = checkDirectConversationDuplicate({ existingConversationId: null })
    assert.isTrue(result.allowed)
  })

  test('denied: conversation already exists', ({ assert }) => {
    const result = checkDirectConversationDuplicate({ existingConversationId: 'conv-001' })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })
})

// ============================================================================
// checkGroupConversationDuplicate
// ============================================================================

test.group('checkGroupConversationDuplicate', () => {
  test('allow: no existing group conversation', ({ assert }) => {
    const result = checkGroupConversationDuplicate({ existingConversationId: null })
    assert.isTrue(result.allowed)
  })

  test('denied: group conversation already exists', ({ assert }) => {
    const result = checkGroupConversationDuplicate({ existingConversationId: 'conv-002' })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })
})

// ============================================================================
// validateRecallScope
// ============================================================================

test.group('validateRecallScope', () => {
  test('allow: SELF scope', ({ assert }) => {
    const result = validateRecallScope(MessageRecallScope.SELF)
    assert.isTrue(result.allowed)
  })

  test('allow: ALL scope', ({ assert }) => {
    const result = validateRecallScope(MessageRecallScope.ALL)
    assert.isTrue(result.allowed)
  })

  test('denied: invalid scope', ({ assert }) => {
    const result = validateRecallScope('broadcast')
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: empty string', ({ assert }) => {
    const result = validateRecallScope('')
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })
})

// ============================================================================
// validateParticipantsOrgMembership
// ============================================================================

test.group('validateParticipantsOrgMembership', () => {
  test('allow: all are org members', ({ assert }) => {
    const result = validateParticipantsOrgMembership({
      allParticipantsAreOrgMembers: true,
      hasOrganization: true,
    })
    assert.isTrue(result.allowed)
  })

  test('allow: no organization — skip check', ({ assert }) => {
    const result = validateParticipantsOrgMembership({
      allParticipantsAreOrgMembers: false,
      hasOrganization: false,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: has org but some participants not members', ({ assert }) => {
    const result = validateParticipantsOrgMembership({
      allParticipantsAreOrgMembers: false,
      hasOrganization: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })
})
