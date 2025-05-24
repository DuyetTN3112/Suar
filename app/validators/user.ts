import vine from '@vinejs/vine'
import { newEmailRule, newUsernameRule } from './auth.js'

export const createUserValidator = vine.compile(
  vine.object({
    firstName: vine.string().maxLength(100),
    lastName: vine.string().maxLength(100),
    username: newUsernameRule.clone(),
    email: newEmailRule.clone(),
    statusId: vine.number(),
    roleId: vine.number(),
  })
)

/**
 * Validator cho cập nhật người dùng
 */
export const updateUserValidator = (userId: number) =>
  vine.compile(
    vine.object({
      firstName: vine.string().maxLength(100),
      lastName: vine.string().maxLength(100),
      username: vine
        .string()
        .maxLength(50)
        .unique(async (db, value) => {
          const exists = await db
            .from('users')
            .where('username', value)
            .whereNot('id', userId)
            .select('id')
            .first()
          return !exists
        }),
      email: vine
        .string()
        .maxLength(254)
        .email()
        .normalizeEmail()
        .unique(async (db, value) => {
          const exists = await db
            .from('users')
            .where('email', value)
            .whereNot('id', userId)
            .select('id')
            .first()
          return !exists
        }),
      statusId: vine.number(),
      roleId: vine.number(),
    })
  )

/**
 * NOTE: Removed updatePasswordValidator - no password updates in OAuth-only system
 */

/**
 * Validator cho cập nhật thông tin chi tiết
 */
export const updateUserDetailValidator = vine.compile(
  vine.object({
    phoneNumber: vine.string().maxLength(20).optional(),
    bio: vine.string().maxLength(1000).optional(),
    avatarUrl: vine.string().url().optional(),
  })
)

/**
 * Validator cho cập nhật hồ sơ người dùng
 */
export const updateUserProfileValidator = vine.compile(
  vine.object({
    dateOfBirth: vine.date().optional(),
    language: vine.string().maxLength(10).optional(),
  })
)

/**
 * Validator cho cập nhật cài đặt người dùng
 */
export const updateUserSettingValidator = vine.compile(
  vine.object({
    theme: vine.string().maxLength(20).optional(),
    displayMode: vine.string().maxLength(20).optional(),
    notificationsEnabled: vine.boolean().optional(),
  })
)
