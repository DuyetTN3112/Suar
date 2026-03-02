import { page } from '@inertiajs/svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('@/apps/user/shared/stores/translation.svelte')

import { translationStore, useTranslation } from '@/apps/user/shared/stores/translation.svelte'

describe('translationStore', () => {
  beforeEach(() => {
    page.props = {
      errors: {},
      flash: {},
    }

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )
    )
  })

  afterEach(() => {
    page.props = {
      errors: {},
      flash: {},
    }
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
    expect(translationStore.t('missing.total', { count: 3 }, ':count items')).toBe('3 items')
    expect(translationStore.t('missing.braced', { count: 3 }, '{count} items')).toBe('3 items')
  })

  it('prioritizes live Inertia page props and unwraps wrapped namespaces', async () => {
    await translationStore.init('en', {
      common: {
        cancel: 'Cancel from init',
      },
      project: {
        title: 'Project from init',
      },
    })

    page.props = {
      errors: {},
      flash: {},
      locale: 'vi',
      translations: {
        common: {
          cancel: 'Hủy từ Inertia',
        },
        project: {
          project: {
            title: 'Dự án từ Inertia',
          },
        },
      },
    }

    const translation = useTranslation()

    expect(translationStore.t('common.cancel')).toBe('Hủy từ Inertia')
    expect(translation.t('project.title')).toBe('Dự án từ Inertia')
    expect(translation.locale).toBe('vi')

    page.props = {
      errors: {},
      flash: {},
      locale: 'en',
      translations: {
        common: {
          cancel: 'Cancel from live page props',
        },
      },
    }

    expect(translation.locale).toBe('en')
    expect(translation.t('common.cancel')).toBe('Cancel from live page props')
    expect(translation.t('project.title')).toBe('Project from init')
  })
})
