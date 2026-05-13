import { test } from '@japa/runner'

import { CreateOrganizationDTO } from '#actions/organizations/dtos/request/create_organization_dto'
import { GetOrganizationMembersDTO } from '#actions/organizations/dtos/request/get_organization_members_dto'
import { InviteUserDTO } from '#actions/organizations/dtos/request/invite_user_dto'
import { ProcessJoinRequestDTO } from '#actions/organizations/dtos/request/process_join_request_dto'
import { UpdateMemberRoleDTO } from '#actions/organizations/dtos/request/update_member_role_dto'
import {
  OrganizationDetailResponseDTO,
  OrganizationListItemResponseDTO,
  OrganizationMemberResponseDTO,
  OrganizationSummaryResponseDTO,
} from '#actions/organizations/dtos/response/organization_response_dtos'
import { OrganizationRole, OrganizationUserStatus } from '#modules/organizations/constants/organization_constants'
import type { OrganizationEntity } from '#modules/organizations/domain/entities/organization_entity'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

test.group('Organization DTO contracts', () => {
  test('CreateOrganizationDTO normalizes creation payloads and rejects invalid names, slugs, and URLs', ({
    assert,
  }) => {
    const dto = new CreateOrganizationDTO(
      '  Cộng đồng Kỹ thuật Việt  ',
      undefined,
      '  Nhóm kỹ thuật nội bộ  ',
      undefined,
      'https://example.com'
    )

    assert.equal(dto.getNormalizedName(), 'Cộng đồng Kỹ thuật Việt')
    assert.equal(dto.getFinalSlug(), 'cong-dong-ky-thuat-viet')

    const object = dto.toObject()
    assert.equal(object.name, 'Cộng đồng Kỹ thuật Việt')
    assert.equal(object.slug, 'cong-dong-ky-thuat-viet')
    assert.equal(object.description, 'Nhóm kỹ thuật nội bộ')
    assert.equal(object.website, 'https://example.com')

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
    assert.equal(dto.getRoleName(), 'Org Admin')
    assert.equal(dto.getRoleNameVi(), 'Quản trị viên')
    assert.isTrue(dto.hasMessage())
    assert.equal(dto.getNormalizedMessage(), 'Welcome aboard')

    const object = dto.toObject()
    assert.equal(object.organization_id, VALID_UUID)
    assert.equal(object.email, 'member@example.com')
    assert.equal(object.org_role, OrganizationRole.ADMIN)
    assert.lengthOf(object.token, 32)
    assert.instanceOf(object.expires_at, Date)

    const fromFactory = InviteUserDTO.fromValidatedPayload({
      organization_id: VALID_UUID,
      email: 'factory@example.com',
      role_id: OrganizationRole.MEMBER,
      message: 'Factory invite',
    })
    assert.equal(fromFactory.organizationId, VALID_UUID)
    assert.equal(fromFactory.roleId, OrganizationRole.MEMBER)

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

  test('InviteUserDTO supports custom role allowlists without leaking controller concerns into callers', ({
    assert,
  }) => {
    const dto = new InviteUserDTO(
      VALID_UUID,
      'custom@example.com',
      'hr',
      [OrganizationRole.ADMIN, OrganizationRole.MEMBER, 'hr'],
      '  Welcome HR  '
    )

    assert.equal(dto.getRoleName(), 'Hr')
    assert.equal(dto.getRoleNameVi(), 'Hr')
    assert.equal(dto.toObject().org_role, 'hr')
    assert.equal(dto.getNormalizedMessage(), 'Welcome HR')

    assert.throws(() => {
      new InviteUserDTO(VALID_UUID, 'custom@example.com', 'cto', [
        OrganizationRole.ADMIN,
        OrganizationRole.MEMBER,
        'hr',
      ])
    })
  })

  test('UpdateMemberRoleDTO validates custom role allowlists and serializes the new role cleanly', ({
    assert,
  }) => {
    const dto = new UpdateMemberRoleDTO(VALID_UUID, VALID_UUID_2, 'project_manager', [
      OrganizationRole.ADMIN,
      OrganizationRole.MEMBER,
      'project_manager',
    ])

    assert.equal(dto.getRoleName(), 'Project Manager')
    assert.equal(dto.getRoleNameVi(), 'Project Manager')
    assert.deepEqual(dto.toObject(), { org_role: 'project_manager' })

    const fromFactory = UpdateMemberRoleDTO.fromValidatedPayload({
      organization_id: VALID_UUID,
      user_id: VALID_UUID_2,
      role_id: OrganizationRole.ADMIN,
      allowed_role_ids: [OrganizationRole.ADMIN, OrganizationRole.MEMBER],
    })
    assert.equal(fromFactory.organizationId, VALID_UUID)
    assert.equal(fromFactory.userId, VALID_UUID_2)
    assert.equal(fromFactory.newRoleId, OrganizationRole.ADMIN)

    assert.throws(() => {
      new UpdateMemberRoleDTO(VALID_UUID, VALID_UUID_2, 'cto', [
        OrganizationRole.ADMIN,
        OrganizationRole.MEMBER,
        'project_manager',
      ])
    })
  })

  test('GetOrganizationMembersDTO accepts status/include filters and uses normalized search in cache key', ({
    assert,
  }) => {
    const dto = new GetOrganizationMembersDTO(
      VALID_UUID,
      2,
      25,
      OrganizationRole.MEMBER,
      '  member@example.com  ',
      'joined_at',
      'desc',
      'active',
      ['activity', 'audit']
    )

    assert.equal(dto.getNormalizedSearch(), 'member@example.com')
    assert.include(dto.getCacheKey(), 'page:2')
    assert.include(dto.getCacheKey(), 'limit:25')
    assert.include(dto.getCacheKey(), 'role:org_member')
    assert.include(dto.getCacheKey(), 'search:member@example.com')
    assert.include(dto.getCacheKey(), 'status:active')
    assert.include(dto.getCacheKey(), 'include:activity,audit')

    const fromFilters = GetOrganizationMembersDTO.fromFilters(VALID_UUID, {
      page: 1,
      limit: 20,
      role_id: OrganizationRole.ADMIN,
      search: 'admin@example.com',
      status_filter: 'pending',
      include: ['audit'],
    })
    assert.equal(fromFilters.organizationId, VALID_UUID)
    assert.equal(fromFilters.page, 1)
    assert.equal(fromFilters.limit, 20)
    assert.equal(fromFilters.roleId, OrganizationRole.ADMIN)

    assert.throws(() => {
      new GetOrganizationMembersDTO(
        VALID_UUID,
        1,
        20,
        OrganizationRole.ADMIN,
        'search',
        'joined_at',
        'desc',
        'pending',
        ['invalid' as 'activity']
      )
    })

    const now = new Date('2026-04-10T00:00:00.000Z')
    const organizationEntity = {
      id: VALID_UUID,
      name: 'Engineering Guild',
      slug: 'engineering-guild',
      description: 'Technical community',
      logo: null,
      website: 'https://example.com',
      ownerId: VALID_UUID_2,
      customRoles: null,
      partnerType: null,
      partnerVerifiedAt: null,
      partnerVerifiedBy: null,
      partnerVerificationProof: null,
      partnerExpiresAt: null,
      partnerIsActive: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    } as unknown as OrganizationEntity

    const detail = OrganizationDetailResponseDTO.fromEntity(organizationEntity)
    assert.equal(detail.slug, 'engineering-guild')

    const listItem = OrganizationListItemResponseDTO.fromEntity(organizationEntity)
    assert.equal(listItem.ownerId, VALID_UUID_2)

    const summary = OrganizationSummaryResponseDTO.fromEntity(organizationEntity)
    assert.equal(summary.name, 'Engineering Guild')

    const member = OrganizationMemberResponseDTO.fromProps({
      id: VALID_UUID_2,
      user_id: VALID_UUID_2,
      username: 'member1',
      email: 'member@example.com',
      org_role: OrganizationRole.MEMBER,
      role_name: 'Member',
      status: OrganizationUserStatus.APPROVED,
      joined_at: now.toISOString(),
      last_activity_at: null,
    })
    assert.equal(member.role_name, 'Member')
  })
})
