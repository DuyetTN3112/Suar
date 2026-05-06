<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import type { Snippet } from 'svelte'

  import AppSidebar from '@/components/layout/app_sidebar.svelte'
  import NavBar from '@/components/layout/nav_bar.svelte'
  import NotificationDialog from '@/components/notification_dialog.svelte'
  import OrganizationRequiredSimpleDialog from '@/components/ui/organization_required_simple_dialog.svelte'

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
    children: Snippet
  }

  const { title = 'Suar', children }: Props = $props()

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

<div class="flex min-h-screen bg-background">
  <AppSidebar open={sidebarOpen} onClose={() => { sidebarOpen = false }} />

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
