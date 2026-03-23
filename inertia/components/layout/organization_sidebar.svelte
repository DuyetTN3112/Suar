<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import Sidebar from '@/components/ui/sidebar/sidebar.svelte'
  import SidebarContent from '@/components/ui/sidebar/sidebar_content.svelte'
  import SidebarFooter from '@/components/ui/sidebar/sidebar_footer.svelte'
  import SidebarHeader from '@/components/ui/sidebar/sidebar_header.svelte'
  import NavGroup from '@/components/layout/nav_group.svelte'
  import NavUser from '@/components/layout/nav_user.svelte'
  import { organizationNavigation } from '@/components/navigation.svelte'

  interface AuthUser {
    id?: string
    username?: string
    email?: string
  }

  interface PageProps {
    user?: {
      auth?: {
        user?: AuthUser
      }
    }
    [key: string]: unknown
  }

  const props = $derived($page.props as unknown as PageProps)
  const authUser = $derived(props.user?.auth?.user || null)

  const userInfo = $derived.by(() => {
    if (authUser) {
      const userEmail = authUser.email || ''
      const userName = authUser.username || authUser.email || 'User'
      return {
        name: userName,
        email: userEmail,
      }
    }
    return null
  })
</script>

<Sidebar
  class="h-screen shrink-0 overflow-hidden border-r border-blue-200 bg-blue-50"
  collapsible="offcanvas"
  variant="sidebar"
>
  <SidebarHeader class="px-2 py-4 border-b border-blue-200">
    <div class="flex items-center gap-2 px-3">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <div class="flex flex-col">
        <span class="text-sm font-semibold text-blue-900">Organization</span>
        <span class="text-xs text-blue-600">Admin Panel</span>
      </div>
    </div>
  </SidebarHeader>

  <SidebarContent class="px-2">
    {#each organizationNavigation as navGroup}
      <NavGroup {...navGroup} />
    {/each}
  </SidebarContent>

  <SidebarFooter class="px-2 py-2 border-t border-blue-200">
    {#if userInfo}
      <NavUser user={userInfo} />
    {/if}
  </SidebarFooter>
</Sidebar>
