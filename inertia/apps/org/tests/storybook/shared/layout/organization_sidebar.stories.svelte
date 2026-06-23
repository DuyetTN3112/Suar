<script>
  import { page } from '@inertiajs/svelte'
  import { Meta, Story } from '@storybook/addon-svelte-csf'

  import OrganizationSidebar from '@/apps/org/shared/components/layout/organization_sidebar.svelte'

  page.url = '/org/tasks'
  page.props = {
    errors: {},
    auth: {
      user: {
        id: 'user-1',
        username: 'duyettn3112',
        email: 'duyettn@suar.app',
        isAdmin: false,
        current_organization_id: 'org-1',
        current_organization_role: 'org_owner',
        organizations: [
          { id: 'org-1', name: 'Suar Studio', org_role: 'org_owner' },
        ],
        projects: [
          { id: 'project-1', name: 'Apollo Project' },
        ],
        current_project: { id: 'project-1', name: 'Apollo Project' },
      },
    },
  }
</script>

<Meta title="Org Layout/Organization Sidebar" component={OrganizationSidebar} />

<Story name="Owner Workspace">
  <div class="flex h-[640px] w-80 overflow-hidden rounded-lg border border-border bg-background text-foreground">
    <OrganizationSidebar open={true} />
  </div>
</Story>
