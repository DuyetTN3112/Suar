import { test } from '@japa/runner'
import { UpdateMemberRoleDTO } from '#actions/organizations/dtos/update_member_role_dto'
import { OrganizationRole } from '#constants/organization_constants'

const ORG_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const USER_UUID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

// ============================================================================
// UpdateMemberRoleDTO - Construction
// ============================================================================
test.group('UpdateMemberRoleDTO | Construction', () => {
  test('creates with valid data', ({ assert }) => {
    const dto = new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN)
    assert.equal(dto.organizationId, ORG_UUID)
    assert.equal(dto.userId, USER_UUID)
    assert.equal(dto.newRoleId, OrganizationRole.ADMIN)
  })

  test('throws for missing organizationId', ({ assert }) => {
    assert.throws(() => new UpdateMemberRoleDTO('', USER_UUID, OrganizationRole.ADMIN))
  })

  test('throws for missing userId', ({ assert }) => {
    assert.throws(() => new UpdateMemberRoleDTO(ORG_UUID, '', OrganizationRole.ADMIN))
  })

  test('throws for missing newRoleId', ({ assert }) => {
    assert.throws(() => new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, ''))
  })

  test('throws for owner role', ({ assert }) => {
    assert.throws(() => new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.OWNER))
  })

  test('throws for invalid role', ({ assert }) => {
    assert.throws(() => new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, 'superadmin'))
  })
})

// ============================================================================
// UpdateMemberRoleDTO - Role Detection
// ============================================================================
test.group('UpdateMemberRoleDTO | Role Detection', () => {
  test('getRoleName returns Admin', ({ assert }) => {
    assert.equal(
      new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN).getRoleName(),
      'Admin'
    )
  })

  test('getRoleName returns Member', ({ assert }) => {
    assert.equal(
      new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.MEMBER).getRoleName(),
      'Member'
    )
  })

  test('getRoleNameVi returns Vietnamese', ({ assert }) => {
    const dto = new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.MEMBER)
    assert.include(dto.getRoleNameVi(), 'Thành viên')
  })

  test('isElevatedRole true for Admin', ({ assert }) => {
    assert.isTrue(
      new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN).isElevatedRole()
    )
  })

  test('isElevatedRole false for Member', ({ assert }) => {
    assert.isFalse(
      new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.MEMBER).isElevatedRole()
    )
  })

  test('isBasicRole true for Member', ({ assert }) => {
    assert.isTrue(
      new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.MEMBER).isBasicRole()
    )
  })

  test('isBasicRole false for Admin', ({ assert }) => {
    assert.isFalse(
      new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN).isBasicRole()
    )
  })
})

// ============================================================================
// UpdateMemberRoleDTO - Promotion/Demotion
// ============================================================================
test.group('UpdateMemberRoleDTO | Promotion/Demotion', () => {
  test('isPromotion: Member -> Admin', ({ assert }) => {
    const dto = new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN)
    assert.isTrue(dto.isPromotion(OrganizationRole.MEMBER))
  })

  test('isPromotion: Admin -> Member is false', ({ assert }) => {
    const dto = new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.MEMBER)
    assert.isFalse(dto.isPromotion(OrganizationRole.ADMIN))
  })

  test('isDemotion: Admin -> Member', ({ assert }) => {
    const dto = new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.MEMBER)
    assert.isTrue(dto.isDemotion(OrganizationRole.ADMIN))
  })

  test('isDemotion: Member -> Admin is false', ({ assert }) => {
    const dto = new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN)
    assert.isFalse(dto.isDemotion(OrganizationRole.MEMBER))
  })

  test('isUnchanged returns true for same role', ({ assert }) => {
    const dto = new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN)
    assert.isTrue(dto.isUnchanged(OrganizationRole.ADMIN))
  })

  test('isUnchanged returns false for different role', ({ assert }) => {
    const dto = new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN)
    assert.isFalse(dto.isUnchanged(OrganizationRole.MEMBER))
  })

  test('getActionType returns promotion', ({ assert }) => {
    const dto = new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN)
    assert.equal(dto.getActionType(OrganizationRole.MEMBER), 'promotion')
  })

  test('getActionType returns demotion', ({ assert }) => {
    const dto = new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.MEMBER)
    assert.equal(dto.getActionType(OrganizationRole.ADMIN), 'demotion')
  })

  test('getActionType returns unchanged', ({ assert }) => {
    const dto = new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN)
    assert.equal(dto.getActionType(OrganizationRole.ADMIN), 'unchanged')
  })
})

// ============================================================================
// UpdateMemberRoleDTO - Serialization
// ============================================================================
test.group('UpdateMemberRoleDTO | Serialization', () => {
  test('toObject returns org_role', ({ assert }) => {
    const dto = new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN)
    assert.deepEqual(dto.toObject(), { org_role: OrganizationRole.ADMIN })
  })

  test('getSummary includes user and role', ({ assert }) => {
    const dto = new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN)
    const summary = dto.getSummary()
    assert.include(summary, USER_UUID)
    assert.include(summary, 'Admin')
    assert.include(summary, ORG_UUID)
  })

  test('getSummary includes current role when provided', ({ assert }) => {
    const dto = new UpdateMemberRoleDTO(ORG_UUID, USER_UUID, OrganizationRole.ADMIN)
    const summary = dto.getSummary('Member')
    assert.include(summary, 'from Member')
  })
})
