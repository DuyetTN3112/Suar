import { test } from '@japa/runner'
import { CreateOrganizationDTO } from '#actions/organizations/dtos/create_organization_dto'
import { DeleteOrganizationDTO } from '#actions/organizations/dtos/delete_organization_dto'
import { AddMemberDTO } from '#actions/organizations/dtos/add_member_dto'
import { UpdateOrganizationDTO } from '#actions/organizations/dtos/update_organization_dto'
import { RemoveMemberDTO } from '#actions/organizations/dtos/remove_member_dto'
import { OrganizationRole } from '#constants/organization_constants'

// ============================================================================
// CreateOrganizationDTO
// ============================================================================
test.group('CreateOrganizationDTO', () => {
  test('creates with valid minimal data', ({ assert }) => {
    const dto = new CreateOrganizationDTO('Acme Corp')
    assert.equal(dto.name, 'Acme Corp')
  })

  test('creates with all fields', ({ assert }) => {
    const dto = new CreateOrganizationDTO(
      'Acme Corp',
      'acme-corp',
      'A tech company',
      'https://example.com/logo.png',
      'https://example.com',
      'premium'
    )
    assert.equal(dto.name, 'Acme Corp')
    assert.equal(dto.slug, 'acme-corp')
    assert.equal(dto.description, 'A tech company')
    assert.equal(dto.plan, 'premium')
  })

  test('throws for empty name', ({ assert }) => {
    assert.throws(() => new CreateOrganizationDTO(''), /required/)
  })

  test('throws for name shorter than 3 characters', ({ assert }) => {
    assert.throws(() => new CreateOrganizationDTO('AB'), /at least 3/)
  })

  test('throws for name longer than 100 characters', ({ assert }) => {
    const longName = 'A'.repeat(101)
    assert.throws(() => new CreateOrganizationDTO(longName), /exceed 100/)
  })

  test('throws for invalid slug characters', ({ assert }) => {
    assert.throws(() => new CreateOrganizationDTO('Test Org', 'INVALID_SLUG'), /lowercase/)
  })

  test('throws for slug starting with hyphen', ({ assert }) => {
    assert.throws(() => new CreateOrganizationDTO('Test Org', '-invalid'), /start or end/)
  })

  test('throws for slug ending with hyphen', ({ assert }) => {
    assert.throws(() => new CreateOrganizationDTO('Test Org', 'invalid-'), /start or end/)
  })

  test('throws for slug with consecutive hyphens', ({ assert }) => {
    assert.throws(() => new CreateOrganizationDTO('Test Org', 'test--slug'), /consecutive/)
  })

  test('throws for slug shorter than 3 characters', ({ assert }) => {
    assert.throws(() => new CreateOrganizationDTO('Test Org', 'ab'), /at least 3/)
  })

  test('throws for description longer than 500 characters', ({ assert }) => {
    const longDesc = 'A'.repeat(501)
    assert.throws(() => new CreateOrganizationDTO('Test Org', undefined, longDesc), /exceed 500/)
  })

  test('throws for invalid logo URL', ({ assert }) => {
    assert.throws(
      () => new CreateOrganizationDTO('Test Org', undefined, undefined, 'not-a-url'),
      /valid URL/
    )
  })

  test('throws for invalid website URL', ({ assert }) => {
    assert.throws(
      () => new CreateOrganizationDTO('Test Org', undefined, undefined, undefined, 'not-a-url'),
      /valid URL/
    )
  })

  test('throws for invalid plan', ({ assert }) => {
    assert.throws(
      () =>
        new CreateOrganizationDTO(
          'Test Org',
          undefined,
          undefined,
          undefined,
          undefined,
          'invalid_plan'
        ),
      /must be one of/
    )
  })

  test('accepts valid plans: free, basic, premium, enterprise', ({ assert }) => {
    for (const plan of ['free', 'basic', 'premium', 'enterprise']) {
      const dto = new CreateOrganizationDTO(
        'Test Org',
        undefined,
        undefined,
        undefined,
        undefined,
        plan
      )
      assert.equal(dto.plan, plan)
    }
  })

  test('toObject returns correct structure', ({ assert }) => {
    const dto = new CreateOrganizationDTO('Acme Corp', 'acme-corp', 'Test desc')
    const obj = dto.toObject()
    assert.equal(obj.name, 'Acme Corp')
    assert.equal(obj.slug, 'acme-corp')
    assert.equal(obj.description, 'Test desc')
    assert.equal(obj.plan, 'free') // default plan
  })

  test('toObject generates slug from name when not provided', ({ assert }) => {
    const dto = new CreateOrganizationDTO('Test Organization')
    const obj = dto.toObject()
    assert.equal(obj.slug, 'test-organization')
  })

  test('getFinalSlug generates slug from name', ({ assert }) => {
    const dto = new CreateOrganizationDTO('Hello World')
    assert.equal(dto.getFinalSlug(), 'hello-world')
  })

  test('getDisplayPlan returns Vietnamese name', ({ assert }) => {
    const dto = new CreateOrganizationDTO(
      'Test',
      undefined,
      undefined,
      undefined,
      undefined,
      'free'
    )
    assert.equal(dto.getDisplayPlan(), 'Miễn phí')
  })

  test('getNormalizedName trims whitespace', ({ assert }) => {
    const dto = new CreateOrganizationDTO('  Acme Corp  ')
    assert.equal(dto.getNormalizedName(), 'Acme Corp')
  })
})

// ============================================================================
// DeleteOrganizationDTO
// ============================================================================
test.group('DeleteOrganizationDTO', () => {
  const validId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

  test('creates soft delete by default', ({ assert }) => {
    const dto = new DeleteOrganizationDTO(validId)
    assert.isFalse(dto.permanent)
    assert.isTrue(dto.isSoftDelete())
    assert.isFalse(dto.isPermanentDelete())
  })

  test('creates permanent delete when specified', ({ assert }) => {
    const dto = new DeleteOrganizationDTO(validId, true)
    assert.isTrue(dto.permanent)
    assert.isTrue(dto.isPermanentDelete())
    assert.isFalse(dto.isSoftDelete())
  })

  test('throws for missing organization ID', ({ assert }) => {
    assert.throws(() => new DeleteOrganizationDTO(''), /required/)
  })

  test('accepts reason', ({ assert }) => {
    const dto = new DeleteOrganizationDTO(validId, false, 'Company dissolved')
    assert.isTrue(dto.hasReason())
    assert.equal(dto.getNormalizedReason(), 'Company dissolved')
  })

  test('throws for reason exceeding 500 characters', ({ assert }) => {
    const longReason = 'A'.repeat(501)
    assert.throws(() => new DeleteOrganizationDTO(validId, false, longReason), /exceed 500/)
  })

  test('hasReason returns false when no reason', ({ assert }) => {
    const dto = new DeleteOrganizationDTO(validId)
    assert.isFalse(dto.hasReason())
  })

  test('getDeletionType returns correct type', ({ assert }) => {
    assert.equal(new DeleteOrganizationDTO(validId).getDeletionType(), 'soft')
    assert.equal(new DeleteOrganizationDTO(validId, true).getDeletionType(), 'permanent')
  })

  test('getSummary includes deletion type', ({ assert }) => {
    const softDto = new DeleteOrganizationDTO(validId)
    assert.include(softDto.getSummary(), 'Deleted')
    assert.notInclude(softDto.getSummary(), 'Permanently')

    const hardDto = new DeleteOrganizationDTO(validId, true)
    assert.include(hardDto.getSummary(), 'Permanently')
  })

  test('getSummary includes reason when provided', ({ assert }) => {
    const dto = new DeleteOrganizationDTO(validId, false, 'Reason X')
    assert.include(dto.getSummary(), 'Reason X')
  })
})

// ============================================================================
// AddMemberDTO
// ============================================================================
test.group('AddMemberDTO', () => {
  const validOrgId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
  const validUserId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

  test('creates with default role (member)', ({ assert }) => {
    const dto = new AddMemberDTO(validOrgId, validUserId)
    assert.equal(dto.roleId, OrganizationRole.MEMBER)
  })

  test('creates with admin role', ({ assert }) => {
    const dto = new AddMemberDTO(validOrgId, validUserId, OrganizationRole.ADMIN)
    assert.equal(dto.roleId, OrganizationRole.ADMIN)
  })

  test('throws when adding as owner', ({ assert }) => {
    assert.throws(
      () => new AddMemberDTO(validOrgId, validUserId, OrganizationRole.OWNER),
      /Cannot directly add.*Owner/
    )
  })

  test('throws for missing organization ID', ({ assert }) => {
    assert.throws(() => new AddMemberDTO('', validUserId), /Organization ID/)
  })

  test('throws for missing user ID', ({ assert }) => {
    assert.throws(() => new AddMemberDTO(validOrgId, ''), /User ID/)
  })

  test('throws for invalid role', ({ assert }) => {
    assert.throws(() => new AddMemberDTO(validOrgId, validUserId, 'invalid_role'), /must be one of/)
  })

  test('getRoleName returns correct English name', ({ assert }) => {
    const dto = new AddMemberDTO(validOrgId, validUserId, OrganizationRole.ADMIN)
    assert.equal(dto.getRoleName(), 'Admin')
  })

  test('getRoleNameVi returns correct Vietnamese name', ({ assert }) => {
    const dto = new AddMemberDTO(validOrgId, validUserId, OrganizationRole.MEMBER)
    assert.equal(dto.getRoleNameVi(), 'Thành viên')
  })
})

// ============================================================================
// UpdateOrganizationDTO
// ============================================================================
test.group('UpdateOrganizationDTO', () => {
  const validId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

  test('creates with valid update data', ({ assert }) => {
    const dto = new UpdateOrganizationDTO(validId, 'New Name')
    assert.equal(dto.name, 'New Name')
  })

  test('throws for missing organization ID', ({ assert }) => {
    assert.throws(() => new UpdateOrganizationDTO('', 'Name'), /Organization ID/)
  })

  test('throws when no updates provided', ({ assert }) => {
    assert.throws(
      () => new UpdateOrganizationDTO(validId),
      'At least one field must be provided for update'
    )
  })

  test('throws for name shorter than 3 characters', ({ assert }) => {
    assert.throws(() => new UpdateOrganizationDTO(validId, 'AB'), /at least 3/)
  })

  test('throws for name longer than 100 characters', ({ assert }) => {
    const longName = 'A'.repeat(101)
    assert.throws(() => new UpdateOrganizationDTO(validId, longName), /exceed 100/)
  })

  test('throws for invalid slug', ({ assert }) => {
    assert.throws(() => new UpdateOrganizationDTO(validId, undefined, 'INVALID'), /lowercase/)
  })

  test('accepts description only update', ({ assert }) => {
    const dto = new UpdateOrganizationDTO(validId, undefined, undefined, 'New desc')
    assert.equal(dto.description, 'New desc')
  })
})

// ============================================================================
// RemoveMemberDTO
// ============================================================================
test.group('RemoveMemberDTO', () => {
  const validOrgId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
  const validUserId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

  test('creates with valid IDs', ({ assert }) => {
    const dto = new RemoveMemberDTO(validOrgId, validUserId)
    assert.equal(dto.organizationId, validOrgId)
    assert.equal(dto.userId, validUserId)
  })

  test('throws for missing organization ID', ({ assert }) => {
    assert.throws(() => new RemoveMemberDTO('', validUserId), /Organization ID/)
  })

  test('throws for missing user ID', ({ assert }) => {
    assert.throws(() => new RemoveMemberDTO(validOrgId, ''), /User ID/)
  })

  test('accepts reason', ({ assert }) => {
    const dto = new RemoveMemberDTO(validOrgId, validUserId, 'Policy violation')
    assert.isTrue(dto.hasReason())
    assert.equal(dto.getNormalizedReason(), 'Policy violation')
  })

  test('throws for reason exceeding 500 characters', ({ assert }) => {
    const longReason = 'A'.repeat(501)
    assert.throws(() => new RemoveMemberDTO(validOrgId, validUserId, longReason), /exceed 500/)
  })

  test('hasReason returns false when no reason', ({ assert }) => {
    const dto = new RemoveMemberDTO(validOrgId, validUserId)
    assert.isFalse(dto.hasReason())
  })

  test('getSummary includes user and org IDs', ({ assert }) => {
    const dto = new RemoveMemberDTO(validOrgId, validUserId)
    const summary = dto.getSummary()
    assert.include(summary, validUserId)
    assert.include(summary, validOrgId)
  })
})
