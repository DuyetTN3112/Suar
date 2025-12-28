<script>
  import { Meta, Story } from '@storybook/addon-svelte-csf'
  import axios from 'axios'

  import NotificationDropdown from '@/apps/user/shared/components/layout/notification_dropdown.svelte'

  axios.get = () => Promise.resolve({
    data: {
      data: [
        {
          id: 'notification-1',
          userId: 'user-1',
          title: 'Task overdue',
          message: 'Review evidence must be submitted today.',
          isRead: false,
          type: 'task_overdue',
          relatedEntityType: 'task',
          relatedEntityId: 'task-1',
          metadata: null,
          readAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'notification-2',
          userId: 'user-1',
          title: 'Sprint updated',
          message: 'Milestone acceptance criteria changed.',
          isRead: true,
          type: 'default',
          relatedEntityType: 'project',
          relatedEntityId: 'project-1',
          metadata: null,
          readAt: new Date().toISOString(),
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
    },
  })
  axios.post = () => Promise.resolve({ data: { success: true } })
  axios.delete = () => Promise.resolve({ data: { success: true } })
</script>

<Meta title="User Layout/Notification Dropdown" component={NotificationDropdown} />

<Story name="Unread Trigger">
  <div class="flex min-h-80 items-start justify-center rounded-lg border border-border bg-background p-12 text-foreground">
    <NotificationDropdown />
  </div>
</Story>
