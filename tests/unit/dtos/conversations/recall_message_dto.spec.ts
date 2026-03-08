import { test } from '@japa/runner'
import { RecallMessageDTO } from '#actions/conversations/dtos/recall_message_dto'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

// ============================================================================
// RecallMessageDTO - Construction
// ============================================================================
test.group('RecallMessageDTO | Construction', () => {
  test('creates with scope all', ({ assert }) => {
    const dto = new RecallMessageDTO(VALID_UUID, 'all')
    assert.equal(dto.messageId, VALID_UUID)
    assert.equal(dto.scope, 'all')
  })

  test('creates with scope self', ({ assert }) => {
    const dto = new RecallMessageDTO(VALID_UUID, 'self')
    assert.equal(dto.scope, 'self')
  })

  test('throws for missing messageId', ({ assert }) => {
    assert.throws(() => new RecallMessageDTO('', 'all'))
  })
})

// ============================================================================
// RecallMessageDTO - Business Logic
// ============================================================================
test.group('RecallMessageDTO | Business Logic', () => {
  test('isRecallForEveryone true for scope all', ({ assert }) => {
    assert.isTrue(new RecallMessageDTO(VALID_UUID, 'all').isRecallForEveryone)
  })

  test('isRecallForEveryone false for scope self', ({ assert }) => {
    assert.isFalse(new RecallMessageDTO(VALID_UUID, 'self').isRecallForEveryone)
  })

  test('isRecallForSelf true for scope self', ({ assert }) => {
    assert.isTrue(new RecallMessageDTO(VALID_UUID, 'self').isRecallForSelf)
  })

  test('isRecallForSelf false for scope all', ({ assert }) => {
    assert.isFalse(new RecallMessageDTO(VALID_UUID, 'all').isRecallForSelf)
  })

  test('replacementMessage returns Vietnamese recall text', ({ assert }) => {
    const dto = new RecallMessageDTO(VALID_UUID, 'all')
    assert.include(dto.replacementMessage, 'thu hồi')
  })

  test('replacementMessage is same for both scopes', ({ assert }) => {
    const all = new RecallMessageDTO(VALID_UUID, 'all')
    const self = new RecallMessageDTO(VALID_UUID, 'self')
    assert.equal(all.replacementMessage, self.replacementMessage)
  })
})
