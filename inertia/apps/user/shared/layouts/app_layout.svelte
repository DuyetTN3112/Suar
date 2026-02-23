<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import type { Snippet } from 'svelte'

  import AppSidebar from '@/apps/user/shared/components/layout/app_sidebar.svelte'
  import NavBar from '@/apps/user/shared/components/layout/nav_bar.svelte'
  import ProjectSidebar from '@/apps/user/shared/components/layout/project_sidebar.svelte'
  import NotificationDialog from '@/apps/user/shared/components/notification_dialog.svelte'
  import OrganizationRequiredSimpleDialog from '@/apps/user/modules/organizations/components/organization_required_simple_dialog.svelte'
  import GlobalFeedbackSurface from '@/apps/shared/feedback/global_feedback_surface.svelte'

  interface PageProps {
    auth?: {
      user?: {
        current_organization_id?: string
      }
    }
    showOrganizationRequiredModal?: boolean
    [key: string]: unknown
  }

  interface Props {
    title?: string
    workspaceMode?: 'personal' | 'project'
    children: Snippet
  }

  const { title = 'Suar', workspaceMode = 'personal', children }: Props = $props()

  let showOrganizationDialog = $state(false)
  let sidebarOpen = $state(false)

  $effect(() => {
    const props = page.props as unknown as PageProps
    const url = page.url

    const hasCurrentOrganization = props.auth?.user?.current_organization_id
    const isOrganizationsPage = url.startsWith('/organizations')

    if (props.showOrganizationRequiredModal && !isOrganizationsPage && !hasCurrentOrganization) {
      showOrganizationDialog = true
    } else if (showOrganizationDialog && (isOrganizationsPage || hasCurrentOrganization)) {
      showOrganizationDialog = false
    }
  })

  function handleOpenChange(open: boolean) {
    showOrganizationDialog = open
  }
</script>

<svelte:head>
  <title>{title}</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta
    http-equiv="content-security-policy"
    content="default-src 'self';
             script-src 'self' 'unsafe-inline' 'unsafe-eval';
             style-src 'self' 'unsafe-inline';
             img-src 'self' data: https:;
             font-src 'self' data:;
             connect-src 'self' https:;
             frame-src 'self';
             object-src 'none';
             base-uri 'self';
             form-action 'self';"
  />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
</svelte:head>

<NotificationDialog />
<GlobalFeedbackSurface />

<div class="flex min-h-screen bg-background">
  {#if workspaceMode === 'project'}
    <ProjectSidebar open={sidebarOpen} onClose={() => { sidebarOpen = false }} />
  {:else}
    <AppSidebar open={sidebarOpen} onClose={() => { sidebarOpen = false }} />
  {/if}

  <div class="flex-1 flex flex-col min-w-0">
    <NavBar onMenuClick={() => { sidebarOpen = true }} />
    <main class="flex-1 p-6 lg:p-8">
      {@render children()}
    </main>
  </div>
</div>

<OrganizationRequiredSimpleDialog
  open={showOrganizationDialog}
  onOpenChange={handleOpenChange}
/>
