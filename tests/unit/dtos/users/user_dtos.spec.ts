import { test } from '@japa/runner'
import { RegisterUserDTO } from '#actions/users/dtos/request/register_user_dto'
import { ChangeUserRoleDTO } from '#actions/users/dtos/request/change_user_role_dto'
import { UpdateUserProfileDTO } from '#actions/users/dtos/request/update_user_profile_dto'
import {
  AddUserSkillDTO,
  UpdateUserSkillDTO,
  RemoveUserSkillDTO,
} from '#actions/users/dtos/request/user_skill_dtos'
import { SystemRoleName } from '#constants/user_constants'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

// ============================================================================
// RegisterUserDTO
// ============================================================================
test.group('RegisterUserDTO', () => {
  test('creates with valid data', ({ assert }) => {
    const dto = new RegisterUserDTO('testuser', 'test@example.com', 'registered_user', 'active')
    assert.equal(dto.username, 'testuser')
    assert.equal(dto.email, 'test@example.com')
    assert.equal(dto.roleId, 'registered_user')
    assert.equal(dto.statusId, 'active')
  })

  test('throws for invalid email (no @)', ({ assert }) => {
    assert.throws(
      () => new RegisterUserDTO('testuser', 'invalid-email', 'registered_user', 'active'),
      /email/i
    )
  })

  test('throws for short username (< 3 chars)', ({ assert }) => {
    assert.throws(
      () => new RegisterUserDTO('ab', 'test@example.com', 'registered_user', 'active'),
      /3 characters/
    )
  })

  test('throws for empty username', ({ assert }) => {
    assert.throws(
      () => new RegisterUserDTO('   ', 'test@example.com', 'registered_user', 'active'),
      /required/i
    )
  })
})

// ============================================================================
// ChangeUserRoleDTO
// ============================================================================
test.group('ChangeUserRoleDTO', () => {
  test('creates with valid role', ({ assert }) => {
    const dto = new ChangeUserRoleDTO(VALID_UUID, SystemRoleName.SYSTEM_ADMIN, VALID_UUID_2)
    assert.equal(dto.targetUserId, VALID_UUID)
    assert.equal(dto.newRoleId, SystemRoleName.SYSTEM_ADMIN)
    assert.equal(dto.changerId, VALID_UUID_2)
  })

  test('throws for invalid role', ({ assert }) => {
    assert.throws(
      () => new ChangeUserRoleDTO(VALID_UUID, 'invalid_role', VALID_UUID_2),
      /must be one of/
    )
  })

  test('throws for empty target user ID', ({ assert }) => {
    assert.throws(
      () => new ChangeUserRoleDTO('', SystemRoleName.REGISTERED_USER, VALID_UUID_2),
      /Invalid target/
    )
  })

  test('throws for empty role', ({ assert }) => {
    assert.throws(() => new ChangeUserRoleDTO(VALID_UUID, '', VALID_UUID_2), /Invalid role/)
  })

  test('throws for empty changer ID', ({ assert }) => {
    assert.throws(
      () => new ChangeUserRoleDTO(VALID_UUID, SystemRoleName.REGISTERED_USER, ''),
      /Invalid changer/
    )
  })

  test('accepts all valid system roles', ({ assert }) => {
    for (const role of Object.values(SystemRoleName)) {
      const dto = new ChangeUserRoleDTO(VALID_UUID, role, VALID_UUID_2)
      assert.equal(dto.newRoleId, role)
    }
  })
})

// ============================================================================
// UpdateUserProfileDTO
// ============================================================================
test.group('UpdateUserProfileDTO', () => {
  test('creates with username only', ({ assert }) => {
    const dto = new UpdateUserProfileDTO(VALID_UUID, 'newuser')
    assert.equal(dto.username, 'newuser')
    assert.isUndefined(dto.email)
  })

  test('creates with email only', ({ assert }) => {
    const dto = new UpdateUserProfileDTO(VALID_UUID, undefined, 'new@example.com')
    assert.equal(dto.email, 'new@example.com')
    assert.isUndefined(dto.username)
  })

  test('throws for empty username', ({ assert }) => {
    assert.throws(() => new UpdateUserProfileDTO(VALID_UUID, ''), /cannot be empty/)
  })

  test('throws for empty email', ({ assert }) => {
    assert.throws(() => new UpdateUserProfileDTO(VALID_UUID, undefined, ''), /cannot be empty/)
  })

  test('throws for invalid email format', ({ assert }) => {
    assert.throws(
      () => new UpdateUserProfileDTO(VALID_UUID, undefined, 'not-an-email'),
      /Invalid email/
    )
  })
})

// ============================================================================
// User Skill DTOs
// ============================================================================
test.group('AddUserSkillDTO', () => {
  test('creates with correct properties', ({ assert }) => {
    const dto = new AddUserSkillDTO(VALID_UUID, 'advanced')
    assert.equal(dto.skill_id, VALID_UUID)
    assert.equal(dto.level_code, 'advanced')
  })
})

test.group('UpdateUserSkillDTO', () => {
  test('creates with correct properties', ({ assert }) => {
    const dto = new UpdateUserSkillDTO(VALID_UUID, 'expert')
    assert.equal(dto.user_skill_id, VALID_UUID)
    assert.equal(dto.level_code, 'expert')
  })
})

test.group('RemoveUserSkillDTO', () => {
  test('creates with correct property', ({ assert }) => {
    const dto = new RemoveUserSkillDTO(VALID_UUID)
    assert.equal(dto.user_skill_id, VALID_UUID)
  })
})
