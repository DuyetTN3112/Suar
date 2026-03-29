<script lang="ts">
  import type { Snippet } from 'svelte'

  import NavBar from '@/apps/org/shared/components/layout/nav_bar.svelte'
  import OrganizationSidebar from '@/apps/org/shared/components/layout/organization_sidebar.svelte'
  import NotificationDialog from '@/apps/org/shared/components/notification_dialog.svelte'
  import GlobalFeedbackSurface from '@/apps/shared/feedback/global_feedback_surface.svelte'

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
<GlobalFeedbackSurface />

<div class="flex min-h-screen overflow-x-hidden bg-background">
  <OrganizationSidebar open={sidebarOpen} onClose={() => { sidebarOpen = false }} />

  <div class="flex-1 flex flex-col min-w-0 overflow-x-hidden">
    <NavBar onMenuClick={() => { sidebarOpen = true }} />
    <main class="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
      {@render children()}
    </main>
  </div>
</div>
