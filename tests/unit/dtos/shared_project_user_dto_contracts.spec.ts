import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  DateRangeDTO,
  IdDTO,
  PaginatedResult,
  PaginationDTO,
  SearchDTO,
} from '#actions/shared/common_dtos'
import { CreateProjectDTO } from '#actions/projects/dtos/request/create_project_dto'
import { UpdateProjectDTO } from '#actions/projects/dtos/request/update_project_dto'
import {
  ProjectDetailResponseDTO,
  ProjectListItemResponseDTO,
  ProjectSummaryResponseDTO,
} from '#actions/projects/dtos/response/project_response_dtos'
import { ChangeUserRoleDTO } from '#actions/users/dtos/request/change_user_role_dto'
import { RegisterUserDTO } from '#actions/users/dtos/request/register_user_dto'
import {
  AddUserSkillDTO,
  RemoveUserSkillDTO,
  UpdateUserSkillDTO,
} from '#actions/users/dtos/request/user_skill_dtos'
import {
  UserListItemResponseDTO,
  UserProfileResponseDTO,
  UserSummaryResponseDTO,
} from '#actions/users/dtos/response/user_response_dtos'
import { UpdateUserProfileDTO } from '#actions/users/dtos/request/update_user_profile_dto'
import { ProjectStatus, ProjectVisibility } from '#constants/project_constants'
import { SystemRoleName } from '#constants/user_constants'
import type { ProjectEntity } from '#domain/projects/entities/project_entity'
import type { UserEntity } from '#domain/users/entities/user_entity'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

test.group('Shared, project, and user DTO contracts', () => {
  test('shared and project DTOs keep bounded metadata, defaults, and invalid-input rejection stable', ({
    assert,
  }) => {
    const pagination = new PaginationDTO(2, 10)
    const result = PaginatedResult.create(['a', 'b'], 25, pagination)

    assert.equal(pagination.offset, 10)
    assert.deepEqual(result.data, ['a', 'b'])
    assert.deepEqual(result.meta, {
      total: 25,
      perPage: 10,
      currentPage: 2,
      lastPage: 3,
      firstPage: 1,
    })

    const invalidSharedFactories = [
      () => new PaginationDTO(0, 10),
      () => new PaginationDTO(1, 101),
      () => new SearchDTO('a'),
      () => new DateRangeDTO(new Date('2026-12-31'), new Date('2026-01-01')),
      () => new IdDTO('0'),
    ]

    for (const factory of invalidSharedFactories) {
      assert.throws(factory)
    }
    const projectDto = new CreateProjectDTO({
      name: 'Quality uplift',
      description: '  Focus on test quality  ',
      organization_id: VALID_UUID,
      visibility: ProjectVisibility.PUBLIC,
      budget: 2000000,
    })

    assert.equal(projectDto.status, ProjectStatus.PENDING)
    assert.equal(projectDto.visibility, ProjectVisibility.PUBLIC)
    assert.equal(projectDto.budget, 2000000)
    assert.equal(projectDto.description, 'Focus on test quality')
    assert.equal(projectDto.toObject().organization_id, VALID_UUID)
    assert.include(projectDto.getSummary(), 'Quality uplift')

    const projectFromFactory = CreateProjectDTO.fromValidatedPayload(
      {
        name: 'Factory project',
        description: '  Factory description  ',
      },
      VALID_UUID
    )
    assert.equal(projectFromFactory.name, 'Factory project')
    assert.equal(projectFromFactory.organization_id, VALID_UUID)

    const updateFromFactory = UpdateProjectDTO.fromValidatedPayload(
      {
        name: '  Updated via factory  ',
        status: ProjectStatus.IN_PROGRESS,
      },
      VALID_UUID
    )
    assert.equal(updateFromFactory.project_id, VALID_UUID)
    assert.equal(updateFromFactory.name, 'Updated via factory')
    assert.equal(updateFromFactory.status, ProjectStatus.IN_PROGRESS)
    assert.deepEqual(
      updateFromFactory.getUpdatedFields().sort(),
      ['description', 'name', 'status'].sort()
    )

    const invalidProjectFactories = [
      () => new CreateProjectDTO({ name: '', organization_id: VALID_UUID }),
      () => new CreateProjectDTO({ name: 'AB', organization_id: VALID_UUID }),
      () => new CreateProjectDTO({ name: 'Valid', organization_id: VALID_UUID, status: 'invalid' }),
      () => new CreateProjectDTO({ name: 'Valid', organization_id: VALID_UUID, budget: -1 }),
      () =>
        new CreateProjectDTO({
          name: 'Valid',
          organization_id: VALID_UUID,
          start_date: DateTime.fromISO('2026-04-10'),
          end_date: DateTime.fromISO('2026-04-01'),
        }),
      () => new UpdateProjectDTO({ project_id: '', name: 'Valid' }),
      () => new UpdateProjectDTO({ project_id: VALID_UUID, status: 'invalid' }),
      () => new UpdateProjectDTO({ project_id: VALID_UUID, budget: -5 }),
    ]

    for (const factory of invalidProjectFactories) {
      assert.throws(factory)
    }

    const now = new Date('2026-04-10T00:00:00.000Z')
    const projectEntity = {
      id: VALID_UUID,
      creatorId: VALID_UUID_2,
      name: 'Quality uplift',
      description: 'Refine DTO contracts',
      organizationId: VALID_UUID,
      startDate: now,
      endDate: null,
      status: ProjectStatus.PENDING,
      budget: '2000000',
      managerId: null,
      ownerId: VALID_UUID_2,
      visibility: ProjectVisibility.PUBLIC,
      allowFreelancer: true,
      approvalRequiredForMembers: false,
      tags: ['quality'],
      customRoles: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    } as unknown as ProjectEntity

    const detailResponse = ProjectDetailResponseDTO.fromEntity(projectEntity)
    assert.equal(detailResponse.id, VALID_UUID)
    assert.equal(detailResponse.budget, '2000000')

    const listItemResponse = ProjectListItemResponseDTO.fromEntity(projectEntity)
    assert.equal(listItemResponse.visibility, ProjectVisibility.PUBLIC)

    const summaryResponse = ProjectSummaryResponseDTO.fromEntity(projectEntity)
    assert.equal(summaryResponse.name, 'Quality uplift')

    const summaryFromProps = ProjectSummaryResponseDTO.fromProps({
      id: VALID_UUID_2,
      name: 'Summary project',
      status: ProjectStatus.IN_PROGRESS,
      visibility: ProjectVisibility.TEAM,
    })
    assert.equal(summaryFromProps.status, ProjectStatus.IN_PROGRESS)
  })

  test('user admin and self-service DTOs accept valid payloads while rejecting malformed identifiers and roles', ({
    assert,
  }) => {
    const registerDto = new RegisterUserDTO(
      'testuser',
      'test@example.com',
      SystemRoleName.REGISTERED_USER,
      'active'
    )
    const roleDto = new ChangeUserRoleDTO(VALID_UUID, SystemRoleName.SYSTEM_ADMIN, VALID_UUID_2)
    const profileDto = new UpdateUserProfileDTO('1', 'newuser', 'new@example.com')

    assert.equal(registerDto.email, 'test@example.com')
    assert.equal(roleDto.newRoleId, SystemRoleName.SYSTEM_ADMIN)
    assert.equal(profileDto.username, 'newuser')
    assert.equal(profileDto.email, 'new@example.com')

    const addSkillDto = AddUserSkillDTO.fromValidatedPayload({
      skill_id: VALID_UUID,
      level_code: 'middle',
    })
    assert.equal(addSkillDto.skill_id, VALID_UUID)
    assert.equal(addSkillDto.level_code, 'middle')

    const updateSkillDto = UpdateUserSkillDTO.fromValidatedPayload({
      user_skill_id: VALID_UUID_2,
      level_code: 'senior',
    })
    assert.equal(updateSkillDto.user_skill_id, VALID_UUID_2)
    assert.equal(updateSkillDto.level_code, 'senior')

    const removeSkillDto = RemoveUserSkillDTO.fromUserSkillId(VALID_UUID)
    assert.equal(removeSkillDto.user_skill_id, VALID_UUID)

    const invalidUserFactories = [
      () => new RegisterUserDTO('ab', 'test@example.com', SystemRoleName.REGISTERED_USER, 'active'),
      () =>
        new RegisterUserDTO('validname', 'invalid-email', SystemRoleName.REGISTERED_USER, 'active'),
      () => new ChangeUserRoleDTO(VALID_UUID, 'invalid_role', VALID_UUID_2),
      () => new ChangeUserRoleDTO('', SystemRoleName.SYSTEM_ADMIN, VALID_UUID_2),
      () => new UpdateUserProfileDTO('0', 'newuser'),
      () => new UpdateUserProfileDTO('1', undefined, 'not-an-email'),
    ]

    for (const factory of invalidUserFactories) {
      assert.throws(factory)
    }

    const now = new Date('2026-04-10T00:00:00.000Z')
    const userEntity = {
      id: VALID_UUID,
      username: 'testuser',
      email: 'test@example.com',
      status: 'active',
      systemRole: 'registered_user',
      currentOrganizationId: null,
      authMethod: 'github',
      avatarUrl: null,
      bio: 'Builder',
      phone: null,
      address: null,
      timezone: 'UTC',
      language: 'en',
      isFreelancer: true,
      freelancerRating: 4.5,
      freelancerCompletedTasksCount: 10,
      profileSettings: null,
      trustData: null,
      credibilityData: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    } as unknown as UserEntity

    const listItem = UserListItemResponseDTO.fromEntity(userEntity)
    assert.equal(listItem.username, 'testuser')

    const profile = UserProfileResponseDTO.fromEntity(userEntity)
    assert.equal(profile.freelancerRating, 4.5)

    const summary = UserSummaryResponseDTO.fromEntity(userEntity)
    assert.equal(summary.id, VALID_UUID)

    const summaryFromProps = UserSummaryResponseDTO.fromProps({
      id: VALID_UUID_2,
      username: 'summary-user',
      email: 'summary@example.com',
      avatarUrl: null,
    })
    assert.equal(summaryFromProps.username, 'summary-user')
  })
})
