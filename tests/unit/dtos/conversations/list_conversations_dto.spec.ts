import { test } from '@japa/runner'
import { ListConversationsDTO } from '#actions/conversations/dtos/request/list_conversations_dto'

// ============================================================================
// ListConversationsDTO - Construction
// ============================================================================
test.group('ListConversationsDTO | Construction', () => {
  test('creates with defaults', ({ assert }) => {
    const dto = new ListConversationsDTO()
    assert.equal(dto.page, 1)
    assert.equal(dto.limit, 15)
  })

  test('creates with custom pagination', ({ assert }) => {
    const dto = new ListConversationsDTO(3, 25)
    assert.equal(dto.page, 3)
    assert.equal(dto.limit, 25)
  })

  test('creates with search', ({ assert }) => {
    const dto = new ListConversationsDTO(1, 15, 'team')
    assert.equal(dto.search, 'team')
  })

  test('throws for page < 1', ({ assert }) => {
    assert.throws(() => new ListConversationsDTO(0))
  })

  test('throws for limit < 1', ({ assert }) => {
    assert.throws(() => new ListConversationsDTO(1, 0))
  })

  test('throws for limit > 50', ({ assert }) => {
    assert.throws(() => new ListConversationsDTO(1, 51))
  })

  test('throws for search > 255 chars', ({ assert }) => {
    assert.throws(() => new ListConversationsDTO(1, 15, 'S'.repeat(256)))
  })
})

// ============================================================================
// ListConversationsDTO - Business Logic
// ============================================================================
test.group('ListConversationsDTO | Business Logic', () => {
  test('offset calculates correctly', ({ assert }) => {
    assert.equal(new ListConversationsDTO(1, 15).offset, 0)
    assert.equal(new ListConversationsDTO(2, 15).offset, 15)
    assert.equal(new ListConversationsDTO(3, 10).offset, 20)
  })

  test('isFirstPage true for page 1', ({ assert }) => {
    assert.isTrue(new ListConversationsDTO().isFirstPage)
  })

  test('isFirstPage false for page > 1', ({ assert }) => {
    assert.isFalse(new ListConversationsDTO(2).isFirstPage)
  })

  test('hasSearch true with search', ({ assert }) => {
    assert.isTrue(new ListConversationsDTO(1, 15, 'test').hasSearch)
  })

  test('hasSearch false without search', ({ assert }) => {
    assert.isFalse(new ListConversationsDTO().hasSearch)
  })

  test('hasSearch false for whitespace-only search', ({ assert }) => {
    assert.isFalse(new ListConversationsDTO(1, 15, '   ').hasSearch)
  })

  test('trimmedSearch trims whitespace', ({ assert }) => {
    assert.equal(new ListConversationsDTO(1, 15, '  test  ').trimmedSearch, 'test')
  })

  test('trimmedSearch is undefined without search', ({ assert }) => {
    assert.isUndefined(new ListConversationsDTO().trimmedSearch)
  })
})
