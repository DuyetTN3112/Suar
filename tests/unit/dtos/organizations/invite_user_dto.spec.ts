import { test } from '@japa/runner'
import { InviteUserDTO } from '#actions/organizations/dtos/invite_user_dto'
import { OrganizationRole } from '#constants/organization_constants'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

// ============================================================================
// InviteUserDTO - Construction
// ============================================================================
test.group('InviteUserDTO | Construction', () => {
  test('creates with defaults (member role)', ({ assert }) => {
    const dto = new InviteUserDTO(VALID_UUID, 'user@example.com')
    assert.equal(dto.organizationId, VALID_UUID)
    assert.equal(dto.email, 'user@example.com')
    assert.equal(dto.roleId, OrganizationRole.MEMBER)
  })

  test('creates with admin role', ({ assert }) => {
    const dto = new InviteUserDTO(VALID_UUID, 'admin@example.com', OrganizationRole.ADMIN)
    assert.equal(dto.roleId, OrganizationRole.ADMIN)
  })

  test('creates with message', ({ assert }) => {
    const dto = new InviteUserDTO(VALID_UUID, 'u@e.com', OrganizationRole.MEMBER, 'Welcome!')
    assert.equal(dto.message, 'Welcome!')
  })

  test('throws for missing organizationId', ({ assert }) => {
    assert.throws(() => new InviteUserDTO('', 'u@e.com'))
  })

  test('throws for missing email', ({ assert }) => {
    assert.throws(() => new InviteUserDTO(VALID_UUID, ''))
  })

  test('throws for invalid email format', ({ assert }) => {
    assert.throws(() => new InviteUserDTO(VALID_UUID, 'not-an-email'))
  })

  test('throws for owner role', ({ assert }) => {
    assert.throws(() => new InviteUserDTO(VALID_UUID, 'u@e.com', OrganizationRole.OWNER))
  })

  test('throws for message > 500 chars', ({ assert }) => {
    assert.throws(
      () => new InviteUserDTO(VALID_UUID, 'u@e.com', OrganizationRole.MEMBER, 'M'.repeat(501))
    )
  })
})

// ============================================================================
// InviteUserDTO - Business Logic
// ============================================================================
test.group('InviteUserDTO | Business Logic', () => {
  test('getNormalizedEmail lowercases and trims', ({ assert }) => {
    const dto = new InviteUserDTO(VALID_UUID, '  User@Example.COM  ')
    assert.equal(dto.getNormalizedEmail(), 'user@example.com')
  })

  test('getRoleName returns Admin', ({ assert }) => {
    assert.equal(
      new InviteUserDTO(VALID_UUID, 'u@e.com', OrganizationRole.ADMIN).getRoleName(),
      'Admin'
    )
  })

  test('getRoleName returns Member', ({ assert }) => {
    assert.equal(
      new InviteUserDTO(VALID_UUID, 'u@e.com', OrganizationRole.MEMBER).getRoleName(),
      'Member'
    )
  })

  test('getRoleNameVi returns Vietnamese', ({ assert }) => {
    const dto = new InviteUserDTO(VALID_UUID, 'u@e.com', OrganizationRole.ADMIN)
    assert.include(dto.getRoleNameVi(), 'Quản trị')
  })

  test('hasMessage returns true with message', ({ assert }) => {
    assert.isTrue(
      new InviteUserDTO(VALID_UUID, 'u@e.com', OrganizationRole.MEMBER, 'Hi').hasMessage()
    )
  })

  test('hasMessage returns false without message', ({ assert }) => {
    assert.isFalse(new InviteUserDTO(VALID_UUID, 'u@e.com').hasMessage())
  })

  test('getNormalizedMessage trims', ({ assert }) => {
    const dto = new InviteUserDTO(VALID_UUID, 'u@e.com', OrganizationRole.MEMBER, '  Hello  ')
    assert.equal(dto.getNormalizedMessage(), 'Hello')
  })

  test('getNormalizedMessage returns null without message', ({ assert }) => {
    assert.isNull(new InviteUserDTO(VALID_UUID, 'u@e.com').getNormalizedMessage())
  })

  test('generateToken produces 32-char string', ({ assert }) => {
    const token = InviteUserDTO.generateToken()
    assert.equal(token.length, 32)
    assert.match(token, /^[A-Za-z0-9]+$/)
  })

  test('generateToken produces unique tokens', ({ assert }) => {
    const tokens = new Set(Array.from({ length: 10 }, () => InviteUserDTO.generateToken()))
    assert.equal(tokens.size, 10)
  })

  test('getExpirationDate is 7 days from now', ({ assert }) => {
    const before = new Date()
    const expiry = InviteUserDTO.getExpirationDate()
    const diff = expiry.getTime() - before.getTime()
    const days = diff / (1000 * 60 * 60 * 24)
    assert.isTrue(days >= 6.9 && days <= 7.1)
  })
})

// ============================================================================
// InviteUserDTO - Serialization
// ============================================================================
test.group('InviteUserDTO | Serialization', () => {
  test('toObject includes all required fields', ({ assert }) => {
    const dto = new InviteUserDTO(VALID_UUID, 'User@Example.com')
    const obj = dto.toObject()
    assert.equal(obj.organization_id, VALID_UUID)
    assert.equal(obj.email, 'user@example.com')
    assert.equal(obj.org_role, OrganizationRole.MEMBER)
    assert.isString(obj.token)
    assert.equal(obj.token.length, 32)
    assert.instanceOf(obj.expires_at, Date)
  })

  test('toObject includes message when present', ({ assert }) => {
    const dto = new InviteUserDTO(VALID_UUID, 'u@e.com', OrganizationRole.MEMBER, 'Hi!')
    assert.equal(dto.toObject().message, 'Hi!')
  })

  test('toObject has null message when not present', ({ assert }) => {
    assert.isNull(new InviteUserDTO(VALID_UUID, 'u@e.com').toObject().message)
  })

  test('getSummary includes email and role', ({ assert }) => {
    const summary = new InviteUserDTO(
      VALID_UUID,
      'Test@Ex.com',
      OrganizationRole.ADMIN
    ).getSummary()
    assert.include(summary, 'test@ex.com')
    assert.include(summary, 'Admin')
  })
})
