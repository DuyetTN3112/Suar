<script lang="ts">
  import type { Snippet } from 'svelte'

  import NavBar from '@/apps/org/shared/components/layout/nav_bar.svelte'
  import NotificationDialog from '@/apps/org/shared/components/notification_dialog.svelte'
  import OrganizationSidebar from '@/apps/org/shared/components/layout/organization_sidebar.svelte'

  interface Props {
    title?: string
    children: Snippet
  }

  const { title = 'Suar', children }: Props = $props()

  let sidebarOpen = $state(false)
</script>

<svelte:head>
  <title>{title}</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
</svelte:head>

<NotificationDialog />

<div class="flex min-h-screen bg-background">
  <OrganizationSidebar open={sidebarOpen} onClose={() => { sidebarOpen = false }} />

  <div class="flex min-w-0 flex-1 flex-col">
    <NavBar onMenuClick={() => { sidebarOpen = true }} />
    <main class="flex-1 p-6 lg:p-8">
      {@render children()}
    </main>
  </div>
</div>
