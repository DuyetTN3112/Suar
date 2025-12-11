import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import PermissionsPage from '@/apps/org/modules/permissions/index.svelte'

const { visitMock } = vi.hoisted(() => ({
  visitMock: vi.fn(),
}))

vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', () =>
  import('../../shared/test_stubs/layout_stub.svelte')
)

vi.mock('@inertiajs/svelte', () => ({
  router: {
    visit: visitMock,
  },
}))

describe('Org permissions page', () => {
  it('shows role permission coverage and routes edits through roles', async () => {
    visitMock.mockClear()

    render(PermissionsPage, {
      props: {
        permissionCatalog: [
          {
            key: 'can_invite_members',
            label: 'Invite members',
            description: 'Invite organization members',
          },
        ],
        projectPermissionCatalog: [],
        organizationRoles: [
          { code: 'org_admin', label: 'Org Admin', permissionCount: 1 },
          { code: 'hr', label: 'HR', permissionCount: 1 },
        ],
        projectRoles: [],
      },
    })

    expect(screen.getByRole('heading', { name: /ma tran quyen/i })).toBeInTheDocument()
    expect(screen.getByText('Org Admin')).toBeInTheDocument()
    expect(screen.getByText('HR')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: /chinh sua vai tro/i }))

    expect(visitMock).toHaveBeenCalledWith('/org/roles')
  })
})
