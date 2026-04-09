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
  import type { SharedData, SharedAuthUser } from '@/types/shared_data'

  // WHITELIST: shell component reads $page.props for auth/org context during transition period.
  const props = $derived($page.props as unknown as SharedData)
  const legacyUser = $derived((props.user as { auth?: { user?: SharedAuthUser } } | undefined)?.auth?.user)
  const authUser = $derived(props.auth?.user ?? legacyUser ?? null)
  const sidebarNavigation = $derived(mainNavigation)

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
  <SidebarHeader class="border-b-2 border-sidebar-border px-3 py-3">
    <a href="/" class="flex items-center gap-2">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-primary text-primary-foreground font-black shadow-neo-sm">S</div>
      <div class="leading-tight">
        <p class="text-sm font-black tracking-wide">SUAR</p>
        <p class="text-[10px] text-muted-foreground">Work platform</p>
      </div>
    </a>
  </SidebarHeader>
  <SidebarContent class="px-2">
    {#each sidebarNavigation as navGroup}
      <NavGroup {...navGroup} />
    {/each}
  </SidebarContent>
  <SidebarFooter class="border-t-2 border-sidebar-border px-2 py-2 space-y-2">
    <TeamSwitcher />
    {#if userInfo}
      <NavUser user={userInfo} />
    {/if}
  </SidebarFooter>
</Sidebar>
