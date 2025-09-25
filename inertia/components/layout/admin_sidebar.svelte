<script lang="ts">
  import { page } from '@inertiajs/svelte'

  import NavGroup from '@/components/layout/nav_group.svelte'
  import NavUser from '@/components/layout/nav_user.svelte'
  import { adminNavigation } from '@/components/navigation.svelte'
  import Sidebar from '@/components/ui/sidebar/sidebar.svelte'
  import SidebarContent from '@/components/ui/sidebar/sidebar_content.svelte'
  import SidebarFooter from '@/components/ui/sidebar/sidebar_footer.svelte'
  import SidebarHeader from '@/components/ui/sidebar/sidebar_header.svelte'
  import type { SharedData, SharedAuthUser } from '@/types/shared_data'

  // WHITELIST: shell component reads page.props for auth/admin context during transition period.
  const props = $derived(page.props as unknown as SharedData)
  const legacyUser = $derived((props.user as { auth?: { user?: SharedAuthUser } } | undefined)?.auth?.user)
  const authUser = $derived(props.auth?.user ?? legacyUser ?? null)

  const userInfo = $derived.by(() => {
    if (authUser) {
      const userEmail = authUser.email ?? ''
      const userName = (authUser.username ?? authUser.email) ?? 'Admin'
      return {
        name: userName,
        email: userEmail,
      }
    }
    return null
  })
</script>

<Sidebar
  class="h-screen shrink-0 overflow-hidden border-r-2 border-sidebar-border bg-sidebar"
  collapsible="offcanvas"
  variant="sidebar"
>
  <SidebarHeader class="border-b-2 border-sidebar-border px-3 py-3">
    <div class="flex items-center gap-2">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-border bg-primary text-primary-foreground font-black shadow-neo-sm">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </div>
      <div class="leading-tight">
        <p class="text-sm font-black tracking-wide text-sidebar-foreground">SUAR ADMIN</p>
        <p class="text-[10px] text-muted-foreground">System control workspace</p>
      </div>
    </div>
  </SidebarHeader>

  <SidebarContent class="px-2">
    {#each adminNavigation as navGroup}
      <NavGroup {...navGroup} />
    {/each}
  </SidebarContent>

  <SidebarFooter class="border-t-2 border-sidebar-border px-2 py-2">
    {#if userInfo}
      <NavUser user={userInfo} />
    {/if}
  </SidebarFooter>
</Sidebar>
