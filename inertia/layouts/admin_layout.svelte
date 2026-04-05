<script lang="ts">
  import type { Snippet } from 'svelte'
  import NavBar from '@/components/layout/nav_bar.svelte'
  import AdminSidebar from '@/components/layout/admin_sidebar.svelte'
  import SidebarProvider from '@/components/ui/sidebar/sidebar_provider.svelte'
  import NotificationDialog from '@/components/notification_dialog.svelte'

  type Props = {
    title?: string
    children: Snippet
  }

  const { title = 'System Admin - Suar', children }: Props = $props()
</script>

<svelte:head>
  <title>{title}</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
</svelte:head>

<NotificationDialog />

<SidebarProvider defaultOpen={true}>
  <div class="relative flex min-h-screen w-full bg-background text-foreground">
    <AdminSidebar />

    <div class="neo-shell-main flex min-h-screen min-w-0 flex-1 flex-col">
      <NavBar />
      <main class="flex-1 p-6">
        {@render children()}
      </main>

      <footer class="border-t-2 border-border bg-card/95 px-6 py-4 text-center text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <p>System Admin Panel - Suar Platform</p>
      </footer>
    </div>
  </div>
</SidebarProvider>
