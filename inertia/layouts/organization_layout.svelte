<script lang="ts">
  import type { Snippet } from 'svelte'

  import NavBar from '@/components/layout/nav_bar.svelte'
  import OrganizationSidebar from '@/components/layout/organization_sidebar.svelte'
  import NotificationDialog from '@/components/notification_dialog.svelte'

  interface Props {
    title?: string
    children: Snippet
  }

  const { title = 'Organization Admin - Suar', children }: Props = $props()

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

  <div class="flex-1 flex flex-col min-w-0">
    <NavBar onMenuClick={() => { sidebarOpen = true }} />
    <main class="flex-1 p-6 lg:p-8">
      {@render children()}
    </main>

    <footer class="control-footer">
      <p>Organization Admin Panel</p>
    </footer>
  </div>
</div>
