<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import { getContext } from 'svelte'
  import Sidebar from '@/components/ui/sidebar/sidebar.svelte'
  import SidebarContent from '@/components/ui/sidebar/sidebar_content.svelte'
  import SidebarFooter from '@/components/ui/sidebar/sidebar_footer.svelte'
  import SidebarHeader from '@/components/ui/sidebar/sidebar_header.svelte'
  import NavGroup from '@/components/layout/nav_group.svelte'
  import NavUser from '@/components/layout/nav_user.svelte'
  import TeamSwitcher from '@/components/layout/team_switcher.svelte'
  import { mainNavigation } from '@/components/navigation.svelte'
  import type { NavGroup as NavGroupType } from '@/components/navigation.svelte'

  interface AuthUser {
    id?: string
    username?: string
    email?: string
    organizations?: Array<{
      id: string
      name: string
      logo?: string
      plan?: string
    }>
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
  class="h-screen overflow-hidden"
  collapsible="offcanvas"
  variant="sidebar"
>
  <SidebarHeader class="px-2 py-2">
    <TeamSwitcher />
  </SidebarHeader>
  <SidebarContent class="px-2">
    {#each mainNavigation as navGroup}
      <NavGroup {...navGroup} />
    {/each}
  </SidebarContent>
  <SidebarFooter class="px-2 py-2">
    {#if userInfo}
      <NavUser user={userInfo} />
    {/if}
  </SidebarFooter>
</Sidebar>
