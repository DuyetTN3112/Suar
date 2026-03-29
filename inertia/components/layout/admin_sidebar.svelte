<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import Sidebar from '@/components/ui/sidebar/sidebar.svelte'
  import SidebarContent from '@/components/ui/sidebar/sidebar_content.svelte'
  import SidebarFooter from '@/components/ui/sidebar/sidebar_footer.svelte'
  import SidebarHeader from '@/components/ui/sidebar/sidebar_header.svelte'
  import NavGroup from '@/components/layout/nav_group.svelte'
  import NavUser from '@/components/layout/nav_user.svelte'
  import { adminNavigation } from '@/components/navigation.svelte'

  interface AuthUser {
    id?: string
    username?: string
    email?: string
  }

  interface PageProps {
    auth?: {
      user?: AuthUser
    }
    user?: {
      auth?: {
        user?: AuthUser
      }
    }
    [key: string]: unknown
  }

  const props = $derived($page.props as unknown as PageProps)
  const authUser = $derived(props.auth?.user ?? props.user?.auth?.user ?? null)

  const userInfo = $derived.by(() => {
    if (authUser) {
      const userEmail = authUser.email || ''
      const userName = authUser.username || authUser.email || 'Admin'
      return {
        name: userName,
        email: userEmail,
      }
    }
    return null
  })
</script>

<Sidebar
  class="h-screen shrink-0 overflow-hidden border-r border-red-200 bg-red-50"
  collapsible="offcanvas"
  variant="sidebar"
>
  <SidebarHeader class="px-2 py-4 border-b border-red-200">
    <div class="flex items-center gap-2 px-3">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </div>
      <div class="flex flex-col">
        <span class="text-sm font-semibold text-red-900">System Admin</span>
        <span class="text-xs text-red-600">Quản trị hệ thống</span>
      </div>
    </div>
  </SidebarHeader>

  <SidebarContent class="px-2">
    {#each adminNavigation as navGroup}
      <NavGroup {...navGroup} />
    {/each}
  </SidebarContent>

  <SidebarFooter class="px-2 py-2 border-t border-red-200">
    {#if userInfo}
      <NavUser user={userInfo} />
    {/if}
  </SidebarFooter>
</Sidebar>
