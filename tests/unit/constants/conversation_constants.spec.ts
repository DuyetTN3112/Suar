import { test } from '@japa/runner'
import {
  MessageSendStatus,
  MessageRecallScope,
  CONVERSATION_DEFAULTS,
} from '#constants/conversation_constants'

// ============================================================================
// MessageSendStatus
// ============================================================================
test.group('MessageSendStatus', () => {
  test('has SENDING status', ({ assert }) => {
    assert.equal(MessageSendStatus.SENDING, 'sending')
  })

  test('has SENT status', ({ assert }) => {
    assert.equal(MessageSendStatus.SENT, 'sent')
  })

  test('has FAILED status', ({ assert }) => {
    assert.equal(MessageSendStatus.FAILED, 'failed')
  })

  test('has exactly 3 values', ({ assert }) => {
    const values = Object.values(MessageSendStatus)
    assert.equal(values.length, 3)
  })
})

// ============================================================================
// MessageRecallScope
// ============================================================================
test.group('MessageRecallScope', () => {
  test('has SELF scope', ({ assert }) => {
    assert.equal(MessageRecallScope.SELF, 'self')
  })

  test('has ALL scope', ({ assert }) => {
    assert.equal(MessageRecallScope.ALL, 'all')
  })
})

// ============================================================================
// CONVERSATION_DEFAULTS
// ============================================================================
test.group('CONVERSATION_DEFAULTS', () => {
  test('has MESSAGES_PER_PAGE', ({ assert }) => {
    assert.equal(CONVERSATION_DEFAULTS.MESSAGES_PER_PAGE, 50)
  })

  test('has CONVERSATIONS_PER_PAGE', ({ assert }) => {
    assert.equal(CONVERSATION_DEFAULTS.CONVERSATIONS_PER_PAGE, 20)
  })

  test('has MAX_MESSAGE_LENGTH', ({ assert }) => {
    assert.equal(CONVERSATION_DEFAULTS.MAX_MESSAGE_LENGTH, 5000)
  })

  test('has MAX_TITLE_LENGTH', ({ assert }) => {
    assert.equal(CONVERSATION_DEFAULTS.MAX_TITLE_LENGTH, 100)
  })

  test('has MESSAGE_PREVIEW_LENGTH', ({ assert }) => {
    assert.equal(CONVERSATION_DEFAULTS.MESSAGE_PREVIEW_LENGTH, 30)
  })
})
