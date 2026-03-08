import { test } from '@japa/runner'
import {
  UserStatusName,
  SystemRoleName,
  AuthMethod,
  OAuthProvider,
  ProficiencyLevel,
  proficiencyLevelOptions,
} from '#constants/user_constants'

test.group('UserConstants', () => {
  test('UserStatusName enum has correct values matching DB CHECK', ({ assert }) => {
    assert.equal(UserStatusName.ACTIVE, 'active')
    assert.equal(UserStatusName.INACTIVE, 'inactive')
    assert.equal(UserStatusName.SUSPENDED, 'suspended')
    assert.equal(Object.values(UserStatusName).length, 3)
  })

  test('SystemRoleName enum has correct values', ({ assert }) => {
    assert.equal(SystemRoleName.SUPERADMIN, 'superadmin')
    assert.equal(SystemRoleName.SYSTEM_ADMIN, 'system_admin')
    assert.equal(SystemRoleName.REGISTERED_USER, 'registered_user')
    assert.equal(Object.values(SystemRoleName).length, 3)
  })

  test('AuthMethod enum has correct values matching DB CHECK', ({ assert }) => {
    assert.equal(AuthMethod.EMAIL, 'email')
    assert.equal(AuthMethod.GOOGLE, 'google')
    assert.equal(AuthMethod.GITHUB, 'github')
    assert.equal(Object.values(AuthMethod).length, 3)
  })

  test('OAuthProvider enum subset of AuthMethod', ({ assert }) => {
    assert.equal(OAuthProvider.GOOGLE, 'google')
    assert.equal(OAuthProvider.GITHUB, 'github')
    // OAuth providers should be a subset of AuthMethod (minus 'email')
    for (const provider of Object.values(OAuthProvider)) {
      assert.include(Object.values(AuthMethod), provider)
    }
  })

  test('ProficiencyLevel enum has 8 levels', ({ assert }) => {
    assert.equal(ProficiencyLevel.BEGINNER, 'beginner')
    assert.equal(ProficiencyLevel.ELEMENTARY, 'elementary')
    assert.equal(ProficiencyLevel.JUNIOR, 'junior')
    assert.equal(ProficiencyLevel.MIDDLE, 'middle')
    assert.equal(ProficiencyLevel.SENIOR, 'senior')
    assert.equal(ProficiencyLevel.LEAD, 'lead')
    assert.equal(ProficiencyLevel.PRINCIPAL, 'principal')
    assert.equal(ProficiencyLevel.MASTER, 'master')
    assert.equal(Object.values(ProficiencyLevel).length, 8)
  })

  test('proficiencyLevelOptions has entry for each ProficiencyLevel', ({ assert }) => {
    const optionValues = proficiencyLevelOptions.map((o) => o.value)
    for (const level of Object.values(ProficiencyLevel)) {
      assert.include(optionValues, level)
    }
    assert.equal(proficiencyLevelOptions.length, 8)
  })

  test('proficiencyLevelOptions have sequential order', ({ assert }) => {
    for (const [i, proficiencyLevelOption] of proficiencyLevelOptions.entries()) {
      assert.equal(proficiencyLevelOption.order, i + 1)
    }
  })

  test('proficiencyLevelOptions have non-overlapping percentage ranges', ({ assert }) => {
    for (let i = 1; i < proficiencyLevelOptions.length; i++) {
      const prev = proficiencyLevelOptions[i - 1]!
      const curr = proficiencyLevelOptions[i]!
      assert.equal(prev.maxPercentage, curr.minPercentage)
    }
  })

  test('proficiencyLevelOptions have required fields', ({ assert }) => {
    for (const option of proficiencyLevelOptions) {
      assert.isString(option.label)
      assert.isString(option.labelVi)
      assert.isString(option.value)
      assert.isString(option.description)
      assert.isNumber(option.minPercentage)
      assert.isNumber(option.maxPercentage)
      assert.isString(option.colorHex)
      assert.isNumber(option.order)
    }
  })
})
