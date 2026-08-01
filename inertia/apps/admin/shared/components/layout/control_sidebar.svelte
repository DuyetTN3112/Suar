<script lang="ts">
  import { page, router } from '@inertiajs/svelte'

  import ControlSidebarNavigation from '@/apps/admin/shared/components/layout/control_sidebar_navigation.svelte'
  import type { SharedAuthUser, SharedData } from '@/apps/admin/shared/types/shared_data'
  import { isNavUrlActive } from '@/apps/admin/shared/components/navigation_helpers'
  import type { NavGroup } from '@/apps/admin/shared/components/navigation_types'

  interface Props {
    open?: boolean
    onClose?: () => void
    navigation: NavGroup[] | (() => NavGroup[])
    brandTitle: string
    brandSubtitle: string
    ticketTitle: string
    ticketText: string
    workspaceLabel: string
    logo?: string
  }

  const {
    open = false,
    onClose,
    navigation,
    brandTitle,
    brandSubtitle,
    ticketTitle,
    ticketText,
    logo = 'S',
  }: Props = $props()

  type LegacySharedData = SharedData & {
    user?: {
      auth?: {
        user?: SharedAuthUser | null
      }
    }
  }

  function coerceSharedData(value: unknown): LegacySharedData {
    return value as LegacySharedData
  }

  const pageProps = $derived.by<LegacySharedData>(() => coerceSharedData(page.props))
  const legacyUser = $derived(pageProps.user?.auth?.user ?? null)
  const authUser = $derived<SharedAuthUser | null>(pageProps.auth?.user ?? legacyUser)
  const currentUrl = $derived(page.url)
  const userName = $derived((authUser?.username ?? authUser?.email) ?? 'User')
  const userEmail = $derived(authUser?.email ?? 'workspace@suar.local')
  const initial = $derived(userName.charAt(0).toUpperCase())
  const safeNavigation = $derived.by(() => {
    const value = typeof navigation === 'function' ? navigation() : navigation
    return Array.isArray(value) ? value : []
  })

  function visit(url: string) {
    if (isNavUrlActive(currentUrl, url)) {
      onClose?.()
      return
    }
    router.visit(url, {
      preserveScroll: true,
      preserveState: false,
      onFinish: () => onClose?.(),
    })
  }

</script>

<aside class:open class="control-sidebar sticky top-0 z-50 flex h-dvh min-h-0 w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
  <div class="control-sidebar-brand flex items-center gap-3 p-4">
    <div class="w-10 h-10 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold text-lg">{logo}</div>
    <div class="min-w-0">
      <strong class="text-sm block truncate">{brandTitle}</strong>
      <span class="text-[10px] text-muted-foreground block truncate">{brandSubtitle}</span>
    </div>
  </div>

  <div class="control-sidebar-ticket mx-3 mb-3 rounded-lg border border-dashed border-border bg-accent px-3 py-2">
    <span class="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{ticketTitle}</span>
    <strong class="mt-0.5 block truncate text-xs">{ticketText}</strong>
  </div>

  <ControlSidebarNavigation navigation={safeNavigation} {currentUrl} onNavigate={visit} />

  <!-- Bottom: isolated system administrator identity -->
  <div class="shrink-0 p-2">
    <div class="rounded-lg border border-border bg-secondary p-2">
      <div class="flex items-center gap-2.5">
        <div class="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">{initial}</div>
        <div class="min-w-0 flex-1">
          <strong class="block truncate text-xs text-foreground">{userName}</strong>
          <span class="text-[10px] text-muted-foreground block truncate">{userEmail}</span>
        </div>
      </div>
    </div>
  </div>
</aside>

<style>
  @media (max-width: 900px) {
    .control-sidebar {
      position: fixed;
      width: 18rem;
      transform: translateX(-108%);
      transition: transform .28s cubic-bezier(.2, .8, .2, 1);
    }
    .control-sidebar.open {
      transform: translateX(0);
    }
  }

  @media (max-height: 760px) {
    .control-sidebar-brand {
      padding-block: 0.75rem;
    }

    .control-sidebar-ticket {
      display: none;
    }
  }
</style>
