import { test } from '@japa/runner'
import { CreateConversationDTO } from '#actions/conversations/dtos/create_conversation_dto'

const VALID_UUID_1 = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
const VALID_UUID_3 = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f'

// ============================================================================
// CreateConversationDTO
// ============================================================================
test.group('CreateConversationDTO', () => {
  test('creates direct conversation with one participant', ({ assert }) => {
    const dto = new CreateConversationDTO([VALID_UUID_1])
    assert.isTrue(dto.isDirect)
    assert.isFalse(dto.isGroup)
    assert.equal(dto.participantIds.length, 1)
  })

  test('creates group conversation with multiple participants', ({ assert }) => {
    const dto = new CreateConversationDTO([VALID_UUID_1, VALID_UUID_2])
    assert.isTrue(dto.isGroup)
    assert.isFalse(dto.isDirect)
  })

  test('creates with initial message', ({ assert }) => {
    const dto = new CreateConversationDTO([VALID_UUID_1], 'Hello!')
    assert.equal(dto.initialMessage, 'Hello!')
  })

  test('creates with title', ({ assert }) => {
    const dto = new CreateConversationDTO([VALID_UUID_1, VALID_UUID_2], undefined, 'Group Chat')
    assert.equal(dto.title, 'Group Chat')
  })

  test('creates with organization ID', ({ assert }) => {
    const dto = new CreateConversationDTO([VALID_UUID_1], undefined, undefined, VALID_UUID_3)
    assert.equal(dto.organizationId, VALID_UUID_3)
  })

  test('throws for empty participants array', ({ assert }) => {
    assert.throws(() => new CreateConversationDTO([]), /at least one participant/)
  })

  test('throws for non-array participants', ({ assert }) => {
    assert.throws(
      () => new CreateConversationDTO('not-array' as unknown as string[]),
      /must be an array/
    )
  })

  test('throws for empty initial message', ({ assert }) => {
    assert.throws(() => new CreateConversationDTO([VALID_UUID_1], '   '), /cannot be empty/)
  })

  test('throws for initial message exceeding 5000 characters', ({ assert }) => {
    assert.throws(() => new CreateConversationDTO([VALID_UUID_1], 'A'.repeat(5001)), /exceed 5000/)
  })

  test('throws for empty title', ({ assert }) => {
    assert.throws(
      () => new CreateConversationDTO([VALID_UUID_1], undefined, '   '),
      /cannot be empty/
    )
  })

  test('throws for title exceeding 255 characters', ({ assert }) => {
    assert.throws(
      () => new CreateConversationDTO([VALID_UUID_1], undefined, 'A'.repeat(256)),
      /exceed 255/
    )
  })

  test('throws for duplicate participant IDs', ({ assert }) => {
    assert.throws(() => new CreateConversationDTO([VALID_UUID_1, VALID_UUID_1]), /must be unique/)
  })

  test('getAllParticipantIds includes creator', ({ assert }) => {
    const dto = new CreateConversationDTO([VALID_UUID_1])
    const allIds = dto.getAllParticipantIds(VALID_UUID_2)
    assert.isTrue(allIds.includes(VALID_UUID_1))
    assert.isTrue(allIds.includes(VALID_UUID_2))
  })

  test('getAllParticipantIds deduplicates creator if already participant', ({ assert }) => {
    const dto = new CreateConversationDTO([VALID_UUID_1])
    const allIds = dto.getAllParticipantIds(VALID_UUID_1)
    assert.equal(allIds.length, 1)
  })
})
