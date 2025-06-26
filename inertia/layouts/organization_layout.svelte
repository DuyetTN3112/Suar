<script lang="ts">
  import type { Snippet } from 'svelte'
  import NavBar from '@/components/layout/nav_bar.svelte'
  import OrganizationSidebar from '@/components/layout/organization_sidebar.svelte'
  import SidebarProvider from '@/components/ui/sidebar/sidebar_provider.svelte'
  import NotificationDialog from '@/components/notification_dialog.svelte'

  type Props = {
    title?: string
    children: Snippet
  }

  const { title = 'Organization Admin - Suar', children }: Props = $props()
</script>

<svelte:head>
  <title>{title}</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-XSS-Protection" content="1; mode=block" />
  <meta http-equiv="X-Content-Type-Options" content="nosniff" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
</svelte:head>

<NotificationDialog />

<SidebarProvider defaultOpen={true}>
  <div class="relative flex min-h-screen w-full bg-slate-50">
    <OrganizationSidebar />

    <div class="flex min-w-0 flex-1 flex-col min-h-screen transition-all duration-300 ease-in-out">
      <NavBar />
      <main class="flex-1 p-6">
        {@render children()}
      </main>

      <footer class="border-t bg-white px-6 py-4 text-center text-sm text-slate-600">
        <p>Organization Admin Panel</p>
      </footer>
    </div>
  </div>
</SidebarProvider>
