import { test } from '@japa/runner'

import ValidationException from '#modules/http/exceptions/validation_exception'
import { AddProjectMemberDTO } from '#modules/projects/actions/dtos/request/add_project_member_dto'
import { RemoveProjectMemberDTO } from '#modules/projects/actions/dtos/request/remove_project_member_dto'
import { UpdateProjectMemberDTO } from '#modules/projects/actions/dtos/request/update_project_member_dto'
import { ProjectRole } from '#modules/projects/constants/project_constants'

test.group('Contract | Project Member DTOs', () => {
  test('AddProjectMemberDTO requires user_id, rejects email-only', ({ assert }) => {
    // Valid payload
    const dto = new AddProjectMemberDTO({
      project_id: 'proj-uuid',
      user_id: 'user-uuid',
      project_role: ProjectRole.MEMBER,
    })
    assert.equal(dto.user_id, 'user-uuid')
    assert.equal(dto.project_role, ProjectRole.MEMBER)
  })

  test('AddProjectMemberDTO rejects missing user_id', ({ assert }) => {
    assert.throws(
      () =>
        new AddProjectMemberDTO({
          project_id: 'proj-uuid',
          user_id: '',
          project_role: ProjectRole.MEMBER,
        }),
      ValidationException
    )
  })

  test('AddProjectMemberDTO rejects missing project_id', ({ assert }) => {
    assert.throws(
      () =>
        new AddProjectMemberDTO({
          project_id: '',
          user_id: 'user-uuid',
          project_role: ProjectRole.MEMBER,
        }),
      ValidationException
    )
  })

  test('AddProjectMemberDTO rejects invalid role', ({ assert }) => {
    assert.throws(
      () =>
        Reflect.construct(AddProjectMemberDTO, [{
          project_id: 'proj-uuid',
          user_id: 'user-uuid',
          project_role: 'invalid_role',
        }]),
      ValidationException
    )
  })

  test('AddProjectMemberDTO defaults to MEMBER role', ({ assert }) => {
    const dto = new AddProjectMemberDTO({
      project_id: 'proj-uuid',
      user_id: 'user-uuid',
    })
    assert.equal(dto.project_role, ProjectRole.MEMBER)
  })

  test('AddProjectMemberDTO correctly identifies owner role', ({ assert }) => {
    const dto = new AddProjectMemberDTO({
      project_id: 'proj-uuid',
      user_id: 'user-uuid',
      project_role: ProjectRole.OWNER,
    })
    assert.isTrue(dto.isOwnerRole())
    assert.isFalse(dto.isManagerRole())
  })

  test('AddProjectMemberDTO correctly identifies manager role', ({ assert }) => {
    const dto = new AddProjectMemberDTO({
      project_id: 'proj-uuid',
      user_id: 'user-uuid',
      project_role: ProjectRole.MANAGER,
    })
    assert.isFalse(dto.isOwnerRole())
    assert.isTrue(dto.isManagerRole())
  })

  test('UpdateProjectMemberDTO validates all fields', ({ assert }) => {
    const dto = new UpdateProjectMemberDTO({
      project_id: 'proj-uuid',
      user_id: 'user-uuid',
      project_role: ProjectRole.MANAGER,
    })
    assert.equal(dto.project_role, ProjectRole.MANAGER)
  })

  test('UpdateProjectMemberDTO rejects invalid role', ({ assert }) => {
    assert.throws(
      () =>
        new UpdateProjectMemberDTO({
          project_id: 'proj-uuid',
          user_id: 'user-uuid',
          project_role: 'bad_role',
        }),
      ValidationException
    )
  })

  test('RemoveProjectMemberDTO validates required fields', ({ assert }) => {
    const dto = new RemoveProjectMemberDTO({
      project_id: 'proj-uuid',
      user_id: 'user-uuid',
    })
    assert.equal(dto.project_id, 'proj-uuid')
    assert.isFalse(dto.hasReason())
    assert.isFalse(dto.shouldReassignTasks())
  })

  test('RemoveProjectMemberDTO accepts optional reason and reassign_to', ({ assert }) => {
    const dto = new RemoveProjectMemberDTO({
      project_id: 'proj-uuid',
      user_id: 'user-uuid',
      reason: 'Leaving project',
      reassign_to: '123',
    })
    assert.isTrue(dto.hasReason())
    assert.isTrue(dto.shouldReassignTasks())
  })

  test('RemoveProjectMemberDTO rejects reason over 500 chars', ({ assert }) => {
    assert.throws(
      () =>
        new RemoveProjectMemberDTO({
          project_id: 'proj-uuid',
          user_id: 'user-uuid',
          reason: 'x'.repeat(501),
        }),
      ValidationException
    )
  })

  test('RemoveProjectMemberDTO rejects reassign_to same as user_id', ({ assert }) => {
    assert.throws(
      () =>
        new RemoveProjectMemberDTO({
          project_id: 'proj-uuid',
          user_id: 'user-uuid',
          reassign_to: 'user-uuid',
        }),
      ValidationException
    )
  })
})
