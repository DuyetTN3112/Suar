<script lang="ts">
  import type { Snippet } from 'svelte'
  import { page } from '@inertiajs/svelte'
  import NavBar from '@/components/layout/nav_bar.svelte'
  import AppSidebar from '@/components/layout/app_sidebar.svelte'
  import SidebarProvider from '@/components/ui/sidebar/sidebar_provider.svelte'
  import OrganizationRequiredSimpleDialog from '@/components/ui/organization_required_simple_dialog.svelte'
  import NotificationDialog from '@/components/notification_dialog.svelte'

  interface PageProps {
    auth?: {
      user?: {
        current_organization_id?: string
      }
    }
    showOrganizationRequiredModal?: boolean
    [key: string]: unknown
  }

  type Props = {
    title?: string
    children: Snippet
  }

  const { title = 'Suar', children }: Props = $props()

  // Kiểm tra xem người dùng có tổ chức hiện tại không
  let showOrganizationDialog = $state(false)

  $effect(() => {
    const props = $page.props as unknown as PageProps
    const url = $page.url

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
    http-equiv="Content-Security-Policy"
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
  <meta http-equiv="X-XSS-Protection" content="1; mode=block" />
  <meta http-equiv="X-Content-Type-Options" content="nosniff" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
</svelte:head>

<NotificationDialog />

<SidebarProvider defaultOpen={true}>
  <div class="relative flex min-h-screen w-full">
    <AppSidebar />

    <div class="flex flex-col w-full min-h-screen transition-all duration-300 ease-in-out">
      <NavBar />
      <main class="flex-1">
        {@render children()}
      </main>
    </div>
  </div>
</SidebarProvider>

<!-- Modal yêu cầu tổ chức đơn giản -->
<OrganizationRequiredSimpleDialog
  open={showOrganizationDialog}
  onOpenChange={handleOpenChange}
/>
