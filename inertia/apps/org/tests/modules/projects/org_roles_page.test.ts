import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import RolesPage from '@/apps/org/modules/roles/index.svelte'

const { putMock } = vi.hoisted(() => ({
  putMock: vi.fn(),
}))

vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', () =>
  import('../../shared/test_stubs/layout_stub.svelte')
)

vi.mock('@inertiajs/svelte', () => ({
  router: {
    put: putMock,
  },
}))

describe('Org roles page', () => {
  const props = {
    organizationRoles: [
      {
        code: 'org_owner',
        label: 'Org Owner',
        description: 'Owns organization settings',
        permissions: [
          {
            key: 'can_manage_settings',
            label: 'Manage settings',
            description: 'Manage organization settings',
          },
        ],
        permissionCount: 1,
        isBuiltIn: true,
        memberCount: 1,
      },
      {
        code: 'hr',
        label: 'HR',
        description: 'People operations',
        permissions: [
          {
            key: 'can_invite_members',
            label: 'Invite members',
            description: 'Invite organization members',
          },
        ],
        permissionCount: 1,
        isBuiltIn: false,
        memberCount: 2,
      },
    ],
    projectRoles: [],
    summary: {
      builtInRoleCount: 1,
      customRoleCount: 1,
    },
  }

  it('lets admins create, edit, and delete custom organization roles', async () => {
    putMock.mockClear()

    render(RolesPage, { props })

    expect(screen.getByRole('button', { name: /them vai tro/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sua org owner/i })).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: /sua hr/i }))
    await fireEvent.input(screen.getByLabelText(/mo ta vai tro/i), {
      target: { value: 'People and hiring operations' },
    })
    await fireEvent.click(screen.getByLabelText(/Manage settings/i))
    await fireEvent.click(screen.getByRole('button', { name: /luu thay doi/i }))

    await waitFor(() => {
      expect(putMock).toHaveBeenCalledWith(
        '/org/roles',
        {
          custom_roles: [
            {
              name: 'hr',
              description: 'People and hiring operations',
              permissions: ['can_invite_members', 'can_manage_settings'],
            },
          ],
        },
        expect.objectContaining({ preserveScroll: true })
      )
    })

    putMock.mockClear()
    await fireEvent.click(screen.getByRole('button', { name: /xoa hr/i }))

    await waitFor(() => {
      expect(putMock).toHaveBeenCalledWith(
        '/org/roles',
        { custom_roles: [] },
        expect.objectContaining({ preserveScroll: true })
      )
    })
  })
})
