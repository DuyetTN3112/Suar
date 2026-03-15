import { test } from '@japa/runner'
import { AddMemberDTO } from '#actions/organizations/dtos/request/add_member_dto'
import { OrganizationRole } from '#constants/organization_constants'

const ORG_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const USER_UUID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

// ============================================================================
// AddMemberDTO - Construction
// ============================================================================
test.group('AddMemberDTO | Construction', () => {
  test('creates with default role (member)', ({ assert }) => {
    const dto = new AddMemberDTO(ORG_UUID, USER_UUID)
    assert.equal(dto.organizationId, ORG_UUID)
    assert.equal(dto.userId, USER_UUID)
    assert.equal(dto.roleId, OrganizationRole.MEMBER)
  })

  test('creates with admin role', ({ assert }) => {
    const dto = new AddMemberDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN)
    assert.equal(dto.roleId, OrganizationRole.ADMIN)
  })

  test('throws for missing organizationId', ({ assert }) => {
    assert.throws(() => new AddMemberDTO('', USER_UUID))
  })

  test('throws for missing userId', ({ assert }) => {
    assert.throws(() => new AddMemberDTO(ORG_UUID, ''))
  })

  test('throws for owner role', ({ assert }) => {
    assert.throws(() => new AddMemberDTO(ORG_UUID, USER_UUID, OrganizationRole.OWNER))
  })

  test('throws for invalid role', ({ assert }) => {
    assert.throws(() => new AddMemberDTO(ORG_UUID, USER_UUID, 'invalid'))
  })
})

// ============================================================================
// AddMemberDTO - Business Logic
// ============================================================================
test.group('AddMemberDTO | Business Logic', () => {
  test('getRoleName returns Admin', ({ assert }) => {
    assert.equal(
      new AddMemberDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN).getRoleName(),
      'Admin'
    )
  })

  test('getRoleName returns Member', ({ assert }) => {
    assert.equal(new AddMemberDTO(ORG_UUID, USER_UUID).getRoleName(), 'Member')
  })

  test('getRoleNameVi returns Vietnamese for Admin', ({ assert }) => {
    const dto = new AddMemberDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN)
    assert.include(dto.getRoleNameVi(), 'Quản trị')
  })

  test('getRoleNameVi returns Vietnamese for Member', ({ assert }) => {
    assert.include(new AddMemberDTO(ORG_UUID, USER_UUID).getRoleNameVi(), 'Thành viên')
  })

  test('isElevatedRole true for Admin', ({ assert }) => {
    assert.isTrue(new AddMemberDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN).isElevatedRole())
  })

  test('isElevatedRole false for Member', ({ assert }) => {
    assert.isFalse(new AddMemberDTO(ORG_UUID, USER_UUID).isElevatedRole())
  })

  test('isBasicRole true for Member', ({ assert }) => {
    assert.isTrue(new AddMemberDTO(ORG_UUID, USER_UUID).isBasicRole())
  })

  test('isBasicRole false for Admin', ({ assert }) => {
    assert.isFalse(new AddMemberDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN).isBasicRole())
  })
})

// ============================================================================
// AddMemberDTO - Serialization
// ============================================================================
test.group('AddMemberDTO | Serialization', () => {
  test('toObject includes all fields', ({ assert }) => {
    const dto = new AddMemberDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN)
    assert.deepEqual(dto.toObject(), {
      organization_id: ORG_UUID,
      user_id: USER_UUID,
      org_role: OrganizationRole.ADMIN,
    })
  })

  test('getSummary includes user, role, and org', ({ assert }) => {
    const summary = new AddMemberDTO(ORG_UUID, USER_UUID).getSummary()
    assert.include(summary, USER_UUID)
    assert.include(summary, 'Member')
    assert.include(summary, ORG_UUID)
  })
})
