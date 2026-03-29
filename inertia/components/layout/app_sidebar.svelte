<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import Sidebar from '@/components/ui/sidebar/sidebar.svelte'
  import SidebarContent from '@/components/ui/sidebar/sidebar_content.svelte'
  import SidebarFooter from '@/components/ui/sidebar/sidebar_footer.svelte'
  import SidebarHeader from '@/components/ui/sidebar/sidebar_header.svelte'
  import NavGroup from '@/components/layout/nav_group.svelte'
  import NavUser from '@/components/layout/nav_user.svelte'
  import TeamSwitcher from '@/components/layout/team_switcher.svelte'
  import { mainNavigation } from '@/components/navigation.svelte'

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
    current_organization_role?: string | null
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
  const currentOrganizationRole = $derived(authUser?.current_organization_role ?? null)
  const sidebarNavigation = $derived.by(() => {
    if (
      currentOrganizationRole === 'org_owner' ||
      currentOrganizationRole === 'org_admin'
    ) {
      return [
        ...mainNavigation,
        {
          title: 'Quản Trị Tổ Chức',
          items: [
            { title: 'Dashboard Org', url: '/org' },
            { title: 'Thành viên', url: '/org/members' },
            { title: 'Dự án Org', url: '/org/projects' },
            { title: 'Workflow', url: '/org/workflow/statuses' },
          ],
        },
      ]
    }

    return mainNavigation
  })

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
  class="h-screen shrink-0 overflow-hidden"
  collapsible="offcanvas"
  variant="sidebar"
>
  <SidebarHeader class="px-2 py-2">
    <TeamSwitcher />
  </SidebarHeader>
  <SidebarContent class="px-2">
    {#each sidebarNavigation as navGroup}
      <NavGroup {...navGroup} />
    {/each}
  </SidebarContent>
  <SidebarFooter class="px-2 py-2">
    {#if userInfo}
      <NavUser user={userInfo} />
    {/if}
  </SidebarFooter>
</Sidebar>
