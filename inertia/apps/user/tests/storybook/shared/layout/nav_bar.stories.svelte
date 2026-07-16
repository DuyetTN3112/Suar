<script>
  import { page } from '@inertiajs/svelte'
  import { Meta, Story } from '@storybook/addon-svelte-csf'
  import axios from 'axios'

  import NavBar from '@/apps/user/shared/components/layout/nav_bar.svelte'

  axios.get = () => Promise.resolve({
    data: {
      data: [
        {
          id: 'notification-1',
          userId: 'user-1',
          title: 'Task assigned',
          message: 'Design QA checklist needs review.',
          isRead: false,
          type: 'task_assigned',
          relatedEntityType: 'task',
          relatedEntityId: 'task-1',
          metadata: null,
          readAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
    },
  })
  axios.post = () => Promise.resolve({ data: { success: true } })
  axios.delete = () => Promise.resolve({ data: { success: true } })

  page.props = {
    auth: {
      user: {
        id: 'user-1',
        username: 'duyettn3112',
        email: 'duyettn@suar.app',
        current_organization_role: 'org_owner',
      },
    },
  }
  page.url = '/'
</script>

<Meta title="User Layout/NavBar" component={NavBar} />

<Story name="Authenticated Header">
  <div class="min-h-64 overflow-hidden rounded-lg border border-border bg-background text-foreground">
    <NavBar />
    <main class="p-6 text-sm text-muted-foreground">
      Search, theme, locale, notification trigger, and user menu share one header surface.
    </main>
  </div>
</Story>
