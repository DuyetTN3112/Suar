import { test } from '@japa/runner'
import { CreateOrganizationDTO } from '#actions/organizations/dtos/request/create_organization_dto'
import { InviteUserDTO } from '#actions/organizations/dtos/request/invite_user_dto'
import { ProcessJoinRequestDTO } from '#actions/organizations/dtos/request/process_join_request_dto'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

test.group('Organization DTO contracts', () => {
  test('CreateOrganizationDTO normalizes creation payloads and rejects invalid names, slugs, URLs, and plans', ({
    assert,
  }) => {
    const dto = new CreateOrganizationDTO(
      '  Cộng đồng Kỹ thuật Việt  ',
      undefined,
      '  Nhóm kỹ thuật nội bộ  ',
      undefined,
      'https://example.com',
      undefined
    )

    assert.equal(dto.getNormalizedName(), 'Cộng đồng Kỹ thuật Việt')
    assert.equal(dto.getFinalSlug(), 'cong-dong-ky-thuat-viet')

    const object = dto.toObject()
    assert.equal(object.name, 'Cộng đồng Kỹ thuật Việt')
    assert.equal(object.slug, 'cong-dong-ky-thuat-viet')
    assert.equal(object.description, 'Nhóm kỹ thuật nội bộ')
    assert.equal(object.plan, 'free')

    const invalidFactories = [
      () => new CreateOrganizationDTO(''),
      () => new CreateOrganizationDTO('AB'),
      () => new CreateOrganizationDTO('Valid Name', 'INVALID_SLUG'),
      () => new CreateOrganizationDTO('Valid Name', '-invalid'),
      () => new CreateOrganizationDTO('Valid Name', 'invalid-'),
      () => new CreateOrganizationDTO('Valid Name', 'test--slug'),
      () => new CreateOrganizationDTO('Valid Name', undefined, 'x'.repeat(501)),
      () => new CreateOrganizationDTO('Valid Name', undefined, undefined, 'not-a-url'),
      () => new CreateOrganizationDTO('Valid Name', undefined, undefined, undefined, 'not-a-url'),
      () =>
        new CreateOrganizationDTO(
          'Valid Name',
          undefined,
          undefined,
          undefined,
          undefined,
          'invalid_plan'
        ),
    ]

    for (const factory of invalidFactories) {
      assert.throws(factory)
    }
  })

  test('InviteUserDTO normalizes invitation payloads and rejects invalid email, owner role, or oversized messages', ({
    assert,
  }) => {
    const dto = new InviteUserDTO(
      VALID_UUID,
      '  Member@Example.com  ',
      OrganizationRole.ADMIN,
      '  Welcome aboard  '
    )

    assert.equal(dto.getNormalizedEmail(), 'member@example.com')
    assert.equal(dto.getRoleName(), 'Admin')
    assert.equal(dto.getRoleNameVi(), 'Quản trị viên')
    assert.isTrue(dto.hasMessage())
    assert.equal(dto.getNormalizedMessage(), 'Welcome aboard')

    const object = dto.toObject()
    assert.equal(object.organization_id, VALID_UUID)
    assert.equal(object.email, 'member@example.com')
    assert.equal(object.org_role, OrganizationRole.ADMIN)
    assert.lengthOf(object.token, 32)
    assert.instanceOf(object.expires_at, Date)

    const invalidFactories = [
      () => new InviteUserDTO(VALID_UUID, '', OrganizationRole.MEMBER),
      () => new InviteUserDTO(VALID_UUID, 'invalid-email', OrganizationRole.MEMBER),
      () => new InviteUserDTO(VALID_UUID, 'user@example.com', OrganizationRole.OWNER),
      () =>
        new InviteUserDTO(VALID_UUID, 'user@example.com', OrganizationRole.MEMBER, 'x'.repeat(501)),
    ]

    for (const factory of invalidFactories) {
      assert.throws(factory)
    }
  })

  test('ProcessJoinRequestDTO preserves approval or rejection semantics and serialization', ({
    assert,
  }) => {
    const approved = new ProcessJoinRequestDTO(VALID_UUID, VALID_UUID_2, true, '  Good fit  ')
    const rejected = new ProcessJoinRequestDTO(VALID_UUID, VALID_UUID_2, false)

    assert.isTrue(approved.isApproval())
    assert.equal(approved.getStatus(), OrganizationUserStatus.APPROVED)
    assert.equal(approved.getNormalizedReason(), 'Good fit')
    assert.include(approved.getSummary(), VALID_UUID_2)
    assert.equal(approved.toObject().status, OrganizationUserStatus.APPROVED)

    assert.isTrue(rejected.isRejection())
    assert.equal(rejected.getStatus(), OrganizationUserStatus.REJECTED)
    assert.equal(rejected.getActionVerbVi(), 'Đã từ chối')
    assert.isNull(rejected.getNormalizedReason())

    const invalidFactories = [
      () => new ProcessJoinRequestDTO('', VALID_UUID_2, true),
      () => new ProcessJoinRequestDTO(VALID_UUID, '', true),
      () => new ProcessJoinRequestDTO(VALID_UUID, VALID_UUID_2, true, 'x'.repeat(501)),
    ]

    for (const factory of invalidFactories) {
      assert.throws(factory)
    }
  })
})
