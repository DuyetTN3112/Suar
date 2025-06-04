import { test } from '@japa/runner'
import { ProcessJoinRequestDTO } from '#actions/organizations/dtos/process_join_request_dto'
import { OrganizationUserStatus } from '#constants/organization_constants'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

// ============================================================================
// ProcessJoinRequestDTO - Construction
// ============================================================================
test.group('ProcessJoinRequestDTO | Construction', () => {
  test('creates approval', ({ assert }) => {
    const dto = new ProcessJoinRequestDTO(VALID_UUID, true)
    assert.equal(dto.requestId, VALID_UUID)
    assert.isTrue(dto.approve)
  })

  test('creates rejection', ({ assert }) => {
    const dto = new ProcessJoinRequestDTO(VALID_UUID, false)
    assert.isFalse(dto.approve)
  })

  test('creates with reason', ({ assert }) => {
    const dto = new ProcessJoinRequestDTO(VALID_UUID, false, 'Not qualified')
    assert.equal(dto.reason, 'Not qualified')
  })

  test('throws for missing requestId', ({ assert }) => {
    assert.throws(() => new ProcessJoinRequestDTO('', true))
  })

  test('throws for reason > 500 chars', ({ assert }) => {
    assert.throws(() => new ProcessJoinRequestDTO(VALID_UUID, true, 'R'.repeat(501)))
  })
})

// ============================================================================
// ProcessJoinRequestDTO - Business Logic
// ============================================================================
test.group('ProcessJoinRequestDTO | Business Logic', () => {
  test('isApproval returns true for approval', ({ assert }) => {
    assert.isTrue(new ProcessJoinRequestDTO(VALID_UUID, true).isApproval())
  })

  test('isApproval returns false for rejection', ({ assert }) => {
    assert.isFalse(new ProcessJoinRequestDTO(VALID_UUID, false).isApproval())
  })

  test('isRejection returns true for rejection', ({ assert }) => {
    assert.isTrue(new ProcessJoinRequestDTO(VALID_UUID, false).isRejection())
  })

  test('isRejection returns false for approval', ({ assert }) => {
    assert.isFalse(new ProcessJoinRequestDTO(VALID_UUID, true).isRejection())
  })

  test('hasReason returns true with reason', ({ assert }) => {
    assert.isTrue(new ProcessJoinRequestDTO(VALID_UUID, true, 'Because').hasReason())
  })

  test('hasReason returns false without reason', ({ assert }) => {
    assert.isFalse(new ProcessJoinRequestDTO(VALID_UUID, true).hasReason())
  })

  test('getNormalizedReason trims whitespace', ({ assert }) => {
    const dto = new ProcessJoinRequestDTO(VALID_UUID, true, '  trimmed  ')
    assert.equal(dto.getNormalizedReason(), 'trimmed')
  })

  test('getNormalizedReason returns null without reason', ({ assert }) => {
    assert.isNull(new ProcessJoinRequestDTO(VALID_UUID, true).getNormalizedReason())
  })

  test('getStatus returns APPROVED for approval', ({ assert }) => {
    assert.equal(
      new ProcessJoinRequestDTO(VALID_UUID, true).getStatus(),
      OrganizationUserStatus.APPROVED
    )
  })

  test('getStatus returns REJECTED for rejection', ({ assert }) => {
    assert.equal(
      new ProcessJoinRequestDTO(VALID_UUID, false).getStatus(),
      OrganizationUserStatus.REJECTED
    )
  })

  test('getActionVerb returns Approved', ({ assert }) => {
    assert.equal(new ProcessJoinRequestDTO(VALID_UUID, true).getActionVerb(), 'Approved')
  })

  test('getActionVerb returns Rejected', ({ assert }) => {
    assert.equal(new ProcessJoinRequestDTO(VALID_UUID, false).getActionVerb(), 'Rejected')
  })

  test('getActionVerbVi returns Vietnamese text', ({ assert }) => {
    assert.include(new ProcessJoinRequestDTO(VALID_UUID, true).getActionVerbVi(), 'phê duyệt')
    assert.include(new ProcessJoinRequestDTO(VALID_UUID, false).getActionVerbVi(), 'từ chối')
  })
})

// ============================================================================
// ProcessJoinRequestDTO - Serialization
// ============================================================================
test.group('ProcessJoinRequestDTO | Serialization', () => {
  test('toObject includes status and processed_at', ({ assert }) => {
    const dto = new ProcessJoinRequestDTO(VALID_UUID, true)
    const obj = dto.toObject()
    assert.equal(obj.status, OrganizationUserStatus.APPROVED)
    assert.instanceOf(obj.processed_at, Date)
  })

  test('toObject includes reason when present', ({ assert }) => {
    const obj = new ProcessJoinRequestDTO(VALID_UUID, false, 'Reason').toObject()
    assert.equal(obj.reason, 'Reason')
  })

  test('toObject has null reason when not provided', ({ assert }) => {
    assert.isNull(new ProcessJoinRequestDTO(VALID_UUID, true).toObject().reason)
  })

  test('getSummary includes action verb and request id', ({ assert }) => {
    const summary = new ProcessJoinRequestDTO(VALID_UUID, true).getSummary()
    assert.include(summary, 'Approved')
    assert.include(summary, VALID_UUID)
  })

  test('getSummary includes reason when present', ({ assert }) => {
    const summary = new ProcessJoinRequestDTO(VALID_UUID, false, 'Not right').getSummary()
    assert.include(summary, 'Rejected')
    assert.include(summary, 'Not right')
  })
})
