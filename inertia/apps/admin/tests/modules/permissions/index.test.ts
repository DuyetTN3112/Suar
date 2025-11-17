import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import AdminPermissionsPage from '@/apps/admin/modules/permissions/index.svelte'

describe('AdminPermissionsPage', () => {
  it('renders permission summary, role permissions, and grouped catalog entries', async () => {
    render(AdminPermissionsPage, {
      props: {
        summary: {
          totalRoleGroups: 3,
          totalRoles: 4,
          totalUniquePermissions: 7,
        },
        systemRoles: [
          {
            code: 'superadmin',
            label: 'Super Admin',
            description: 'Full system operator',
            permissionCount: 2,
            permissions: [
              {
                key: 'admin.users.read',
                label: 'Read users',
                description: 'Read user records',
                category: 'Users',
              },
              {
                key: 'admin.audit.read',
                label: 'Read audit logs',
                description: 'Read audit records',
                category: 'Audit',
              },
            ],
          },
        ],
        organizationRoles: [
          {
            code: 'org_owner',
            label: 'Org Owner',
            description: 'Owns organization settings',
            permissionCount: 1,
            permissions: [
              {
                key: 'org.members.invite',
                label: 'Invite members',
                description: 'Invite organization members',
                category: 'Membership',
              },
            ],
          },
        ],
        projectRoles: [],
        catalogs: {
          system: [
            {
              key: 'admin.users.read',
              label: 'Read users',
              description: 'Read user records',
              category: 'Users',
            },
          ],
          organization: [
            {
              key: 'org.members.invite',
              label: 'Invite members',
              description: 'Invite organization members',
              category: 'Membership',
            },
          ],
          project: [],
        },
      },
    })

    expect(screen.getByRole('heading', { name: 'Vai trò và quyền hạn' })).toBeInTheDocument()
    expect(screen.getByText('Nhóm vai trò')).toBeInTheDocument()
    expect(screen.getByText('Mã quyền')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()

    const organizationTab = screen.getByRole('tab', { name: 'Tổ chức' })
    await fireEvent.click(organizationTab)

    expect(organizationTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Vai trò tổ chức')).toBeInTheDocument()
    expect(screen.getByText('Org Owner')).toBeInTheDocument()
    expect(screen.getByText('org_owner')).toBeInTheDocument()
    expect(screen.getAllByText('Invite members')).not.toHaveLength(0)
    expect(screen.getByText('org.members.invite')).toBeInTheDocument()
  })
})
