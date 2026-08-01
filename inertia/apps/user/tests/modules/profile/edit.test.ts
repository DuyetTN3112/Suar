import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ProfileEditPage from '@/apps/user/modules/profile/edit.svelte'

const { routerPatch } = vi.hoisted(() => ({
  routerPatch: vi.fn(),
}))

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/modules/profile/components/add_skill_modal.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/modules/profile/components/edit_skill_modal.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/modules/profile/components/profile_completeness.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/modules/profile/components/profile_header.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/modules/profile/components/skills_section.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/shared/components/confirm_dialog.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@inertiajs/svelte', () => ({
  page: {
    props: {
      flash: {},
      errors: {},
    },
  },
  router: {
    delete: vi.fn(),
    patch: routerPatch,
    put: vi.fn(),
  },
}))

vi.mock('@/apps/user/shared/stores/translation.svelte', async () => {
  return import('#tests/frontend/translation_mock')
})

function buildProps() {
  return {
    shellMode: 'app' as const,
    auth: {
      user: {
        current_organization_role: 'org_member',
      },
    },
    user: {
      id: 'user-1',
      username: 'duyet',
      email: 'duyet@example.com',
      bio: 'Builder',
      phone: null,
      address: null,
      timezone: 'Asia/Ho_Chi_Minh',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-07-27T00:00:00.000Z',
      profile_settings: {
        is_searchable: true,
      },
      current_organization: {
        id: 'org-1',
        name: 'Suar',
      },
    },
    completeness: 80,
    availableSkills: [],
    proficiencyLevels: [],
    userSkills: [],
  }
}

describe('ProfileEditPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('submits discoverability changes from the privacy toggle', async () => {
    render(ProfileEditPage, {
      props: buildProps(),
    })

    const toggle = screen.getByRole('checkbox', { name: 'Hiển thị trong tìm kiếm nhân tài' })
    expect(toggle).toBeChecked()

    await fireEvent.click(toggle)

    await waitFor(() => {
      expect(routerPatch).toHaveBeenCalledWith(
        '/profile/discoverability',
        { is_searchable: false },
        expect.objectContaining({
          preserveState: true,
          preserveScroll: true,
        })
      )
    })
  })
})
