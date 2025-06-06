import { test } from '@japa/runner'
import { SendMessageDTO } from '#actions/conversations/dtos/request/send_message_dto'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

// ============================================================================
// SendMessageDTO - Construction
// ============================================================================
test.group('SendMessageDTO | Construction', () => {
  test('creates with valid data', ({ assert }) => {
    const dto = new SendMessageDTO(VALID_UUID, 'Hello world')
    assert.equal(dto.conversationId, VALID_UUID)
    assert.equal(dto.message, 'Hello world')
  })

  test('throws for missing conversationId', ({ assert }) => {
    assert.throws(() => new SendMessageDTO('', 'Hello'))
  })

  test('throws for missing message', ({ assert }) => {
    assert.throws(() => new SendMessageDTO(VALID_UUID, ''))
  })

  test('throws for whitespace-only message', ({ assert }) => {
    assert.throws(() => new SendMessageDTO(VALID_UUID, '   '))
  })

  test('throws for message > 5000 chars', ({ assert }) => {
    assert.throws(() => new SendMessageDTO(VALID_UUID, 'M'.repeat(5001)))
  })

  test('accepts message at max length', ({ assert }) => {
    const dto = new SendMessageDTO(VALID_UUID, 'M'.repeat(5000))
    assert.equal(dto.message.length, 5000)
  })
})

// ============================================================================
// SendMessageDTO - Business Logic
// ============================================================================
test.group('SendMessageDTO | Business Logic', () => {
  test('trimmedMessage trims whitespace', ({ assert }) => {
    const dto = new SendMessageDTO(VALID_UUID, '  Hello  ')
    assert.equal(dto.trimmedMessage, 'Hello')
  })

  test('trimmedMessage preserves inner spaces', ({ assert }) => {
    const dto = new SendMessageDTO(VALID_UUID, '  Hello World  ')
    assert.equal(dto.trimmedMessage, 'Hello World')
  })
})
