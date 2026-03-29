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
import { ChangeUserRoleDTO } from '#actions/users/dtos/request/change_user_role_dto'
import { RegisterUserDTO } from '#actions/users/dtos/request/register_user_dto'
import { UpdateUserProfileDTO } from '#actions/users/dtos/request/update_user_profile_dto'
import { ProjectStatus, ProjectVisibility } from '#constants/project_constants'
import { SystemRoleName } from '#constants/user_constants'

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
  })
})
