import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) as unknown
}

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return prefix ? [prefix] : []
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key
    return flattenKeys(child, nextPrefix)
  })
}

describe('settings i18n resources', () => {
  it('keeps English and Vietnamese settings keys in sync', () => {
    const englishKeys = flattenKeys(readJson('resources/lang/en/settings.json')).sort()
    const vietnameseKeys = flattenKeys(readJson('resources/lang/vi/settings.json')).sort()

    expect(englishKeys).toEqual(vietnameseKeys)
  })

  it('provides shell and appearance keys used by the settings surfaces', () => {
    const englishKeys = flattenKeys(readJson('resources/lang/en/settings.json'))
    const vietnameseKeys = flattenKeys(readJson('resources/lang/vi/settings.json'))

    for (const key of [
      'index_title',
      'account_title',
      'account_card_description',
      'account_personal_title',
      'account_personal_description',
      'account_info_title',
      'login_identity_title',
      'personal_information_title',
      'profile_title',
      'profile_breadcrumb',
      'profile_card_description',
      'profile_info_title',
      'notifications_title',
      'notifications_card_description',
      'notification_options',
      'notification_empty',
      'email_notifications',
      'push_notifications',
      'saving',
      'save_changes',
      'default_user_name',
      'no_email',
      'display_name',
      'username',
      'email',
      'field_locked',
      'phone',
      'phone_placeholder',
      'timezone',
      'timezone_placeholder',
      'address',
      'address_placeholder',
      'bio',
      'bio_placeholder',
      'urls',
      'remove',
      'add_url',
      'update_personal_info',
      'update_profile',
      'profile_skills_title',
      'add_skill',
      'remove_skill_title',
      'remove_skill_description',
      'account_package_title',
      'plan_base_description',
      'plan_pro_description',
      'plan_pro_max_description',
      'related_pages_title',
      'profile_link',
      'my_applications_link',
      'task_review_board_link',
      'marketplace_tasks_link',
      'avatar',
      'uploading',
      'upload_new_avatar',
      'avatar_requirements',
      'verified_email_placeholder',
      'my_audit_log_title',
    ]) {
      expect(englishKeys).toContain(key)
      expect(vietnameseKeys).toContain(key)
    }
  })
})
