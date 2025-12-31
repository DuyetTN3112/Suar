<script>
  import { page } from '@inertiajs/svelte'
  import { Meta, Story } from '@storybook/addon-svelte-csf'

  import AppSidebar from '@/apps/user/shared/components/layout/app_sidebar.svelte'

  page.url = '/marketplace/talents'
  page.props = {
    auth: {
      user: {
        id: 'user-1',
        username: 'duyettn3112',
        email: 'duyettn@suar.app',
        isAdmin: false,
        current_organization_id: 'org-1',
        current_organization_role: 'org_owner',
        current_project: { id: 'project-1', name: 'Suar Launch' },
        organizations: [
          { id: 'org-1', name: 'Suar Studio', org_role: 'org_owner' },
          { id: 'org-2', name: 'Review Lab', org_role: 'org_admin' },
        ],
        projects: [
          { id: 'project-1', name: 'Suar Launch' },
          { id: 'project-2', name: 'Storybook Recovery' },
        ],
      },
    },
  }
</script>

<Meta title="User Layout/App Sidebar" component={AppSidebar} />

<Story name="Owner Navigation">
  <div class="flex h-[640px] w-80 overflow-hidden rounded-lg border border-border bg-background text-foreground">
    <AppSidebar open={true} />
  </div>
</Story>
