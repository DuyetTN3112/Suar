import { test } from '@japa/runner'

import { fakeRequest } from '../support/user_controller_mappers_test_support.js'

import {
  buildAddUserSkillDTO,
  buildPendingApprovalUsersListDTO,
  buildPublishUserProfileSnapshotDTO,
  buildUpdateProfileSnapshotAccessDTO,
  buildUpdateUserDetailsDTO,
  buildUpdateUserSkillDTO,
} from '#modules/users/controllers/mappers/request/profile/user_request_mapper'

test.group('Unit | User Controller Mappers - Request DTOs', () => {
  test('user request mappers normalize pagination and alias filters for adapter layer', ({
    assert,
  }) => {
    const pendingDto = buildPendingApprovalUsersListDTO(
      fakeRequest({
        page: '2',
        limit: '5',
        search: 'pending-user',
      }) as never,
      'org-2'
    )

    assert.equal(pendingDto.pagination.page, 2)
    assert.equal(pendingDto.pagination.limit, 5)
    assert.equal(pendingDto.filters.search, 'pending-user')
    assert.equal(pendingDto.filters.organizationUserStatus, 'pending')

    const publishDto = buildPublishUserProfileSnapshotDTO(
      fakeRequest({
        snapshotName: 'Public v2',
        isPublic: true,
        expiresInDays: 14,
      }) as never
    )
    assert.equal(publishDto.snapshotName, 'Public v2')
    assert.isTrue(publishDto.isPublic ?? false)
    assert.equal(publishDto.expiresInDays, 14)

    const accessDto = buildUpdateProfileSnapshotAccessDTO(
      fakeRequest({
        isPublic: false,
        expiresInDays: 3,
      }) as never,
      'snapshot-1'
    )
    assert.equal(accessDto.snapshotId, 'snapshot-1')
    assert.isFalse(accessDto.isPublic)
    assert.equal(accessDto.expiresInDays, 3)

    const addSkillDto = buildAddUserSkillDTO(
      fakeRequest({
        skillId: 'skill-1',
        verifiedPublicProficiencyCode: 'l10',
      }) as never
    )
    assert.equal(addSkillDto.skill_id, 'skill-1')
    assert.equal(addSkillDto.verified_public_proficiency_code, 'l10')

    const updateSkillDto = buildUpdateUserSkillDTO(
      fakeRequest({
        verifiedPublicProficiencyCode: 'l7',
      }) as never,
      'user-skill-1'
    )
    assert.equal(updateSkillDto.user_skill_id, 'user-skill-1')
    assert.equal(updateSkillDto.verified_public_proficiency_code, 'l7')

    assert.throws(() =>
      buildAddUserSkillDTO(
        fakeRequest({
          skillId: 'skill-1',
          verifiedPublicProficiencyCode: 'senior',
        }) as never
      )
    )

    assert.throws(() =>
      buildUpdateUserSkillDTO(
        fakeRequest({
          verifiedPublicProficiencyCode: 'junior',
        }) as never,
        'user-skill-1'
      )
    )

    const detailsDto = buildUpdateUserDetailsDTO(
      fakeRequest({
        avatarUrl: 'https://example.com/avatar.png',
        isExternalContributor: true,
        timezone: 'Asia/Ho_Chi_Minh',
      }) as never
    )

    assert.equal(detailsDto.avatar_url, 'https://example.com/avatar.png')
    assert.isTrue(detailsDto.is_external_contributor ?? false)
    assert.equal(detailsDto.timezone, 'Asia/Ho_Chi_Minh')
  })
})
