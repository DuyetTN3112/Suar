<script lang="ts">
  import type { Snippet } from 'svelte'

  import AdminSidebar from '@/components/layout/admin_sidebar.svelte'
  import NavBar from '@/components/layout/nav_bar.svelte'
  import NotificationDialog from '@/components/notification_dialog.svelte'

  interface Props {
    title?: string
    children: Snippet
  }

  const { title = 'System Admin - Suar', children }: Props = $props()

  let sidebarOpen = $state(false)

  function openSidebar() {
    sidebarOpen = true
  }

  function closeSidebar() {
    sidebarOpen = false
  }
</script>

<svelte:head>
  <title>{title}</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
</svelte:head>

<NotificationDialog />

<div class="flex min-h-screen bg-background">
  <AdminSidebar open={sidebarOpen} onClose={closeSidebar} />

  <div class="flex-1 flex flex-col min-w-0">
    <NavBar onMenuClick={openSidebar} />
    <main class="flex-1 p-6 lg:p-8">
      {@render children()}
    </main>
  </div>
</div>
