import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { translationStore } from '@/apps/user/shared/stores/translation.svelte'

describe('translationStore', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({}),
      }))
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves namespace-wrapped and flat translation modules', async () => {
    await translationStore.init('vi', {
      common: {
        cancel: 'Hủy',
      },
      settings: {
        index_title: 'Cài đặt',
      },
      task: {
        task: {
          task_list: 'Danh sách task',
        },
      },
      user: {
        user: {
          selected_users: 'Đã chọn :count người dùng',
          users: 'Người dùng',
        },
      },
    })

    expect(translationStore.t('common.cancel', {}, 'Cancel')).toBe('Hủy')
    expect(translationStore.t('settings.index_title', {}, 'Settings')).toBe('Cài đặt')
    expect(translationStore.t('task.task_list', {}, 'Task List')).toBe('Danh sách task')
    expect(translationStore.t('user.users', {}, 'Users')).toBe('Người dùng')
    expect(translationStore.t('user.selected_users', { count: 2 }, ':count users selected')).toBe(
      'Đã chọn 2 người dùng'
    )
  })
})
