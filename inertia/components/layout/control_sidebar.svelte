<script lang="ts">
  import { page, router } from '@inertiajs/svelte'

  import type { NavGroup } from '@/components/navigation.svelte'
  import { FRONTEND_ROUTES } from '@/constants'
  import { formatRoleLabel } from '@/lib/access_ui'
  import type { SharedAuthUser, SharedAuthOrganization, SharedData } from '@/types/shared_data'
  

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
    workspaceLabel,
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
  const currentUrl = $derived(page.url.split('?')[0])
  const userName = $derived((authUser?.username ?? authUser?.email) ?? 'User')
  const userEmail = $derived(authUser?.email ?? 'workspace@suar.local')
  const initial = $derived(userName.charAt(0).toUpperCase())
  const isAdmin = $derived(Boolean(authUser?.isAdmin))
  const safeNavigation = $derived.by(() => {
    const value = typeof navigation === 'function' ? navigation() : navigation
    return Array.isArray(value) ? value : []
  })

  // Organization list — same shape as team_switcher
  const organizations = $derived.by(() => {
    const orgs: SharedAuthOrganization[] = authUser?.organizations ?? []
    return orgs.map((org: SharedAuthOrganization) => ({
      id: org.id,
      name: org.name,
      org_role: org.org_role ?? null,
    }))
  })

  // Track current org from page props
  const currentOrgId = $derived(authUser?.current_organization_id ?? null)
  const currentOrg = $derived.by(() => {
    const orgs = organizations
    if (currentOrgId) return orgs.find((o) => o.id === currentOrgId) ?? null
    return orgs[0] ?? null
  })

  function isActive(url: string) {
    return currentUrl === url
  }

  function visit(url: string) {
    if (currentUrl === url) {
      onClose?.()
      return
    }
    router.visit(url, {
      preserveScroll: true,
      preserveState: false,
      onFinish: () => onClose?.(),
    })
  }

  // ── Org switch: reload current page, no redirect ──
  let isSwitching = $state(false)
  async function handleSwitchOrg(orgId: string) {
    if (!orgId || isSwitching) return
    isSwitching = true
    try {
      const csrfToken =
        document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
      const response = await fetch(FRONTEND_ROUTES.SWITCH_ORGANIZATION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({
          organization_id: orgId,
          current_path: currentUrl,
        }),
        credentials: 'same-origin',
      })
      const payload = (await response.json()) as { success?: boolean; redirect?: string; message?: string }
      if (!response.ok || !payload.success) {
        console.error('[ControlSidebar] Switch org failed:', payload.message)
        isSwitching = false
        return
      }
      router.visit(payload.redirect ?? currentUrl, {
        preserveState: false,
        preserveScroll: false,
        replace: true,
      })
    } catch (err) {
      console.error('[ControlSidebar] Switch org error:', err)
      isSwitching = false
    }
  }

  // ── Project switch ──
  const currentProjectId = $derived(authUser?.current_project?.id ?? null)
  const currentProject = $derived(authUser?.current_project ?? null)
  const projects = $derived((authUser as unknown as { projects?: { id: string; name: string }[] } | null)?.projects ?? [])
  
  let isSwitchingProject = $state(false)
  async function handleSwitchProject(projectId: string) {
    if (!projectId || isSwitchingProject) return
    isSwitchingProject = true
    try {
      const csrfToken =
        document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
      const response = await fetch('/switch-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ project_id: projectId }),
        credentials: 'same-origin',
      })
      const payload = (await response.json()) as { success?: boolean; message?: string }
      if (!response.ok || !payload.success) {
        console.error('[ControlSidebar] Switch project failed:', payload.message)
        isSwitchingProject = false
        return
      }
      router.visit(currentUrl, {
        preserveState: false,
        preserveScroll: true,
        replace: true,
      })
    } catch (err) {
      console.error('[ControlSidebar] Switch project error:', err)
      isSwitchingProject = false
    }
  }
</script>

<aside class:open class="control-sidebar w-72 shrink-0 h-screen sticky top-0 z-50 flex flex-col bg-white border-r border-border">
  <div class="p-5 flex items-center gap-3">
    <div class="w-10 h-10 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold text-lg">{logo}</div>
    <div class="min-w-0">
      <strong class="text-sm block truncate">{brandTitle}</strong>
      <span class="text-[10px] text-muted-foreground block truncate">{brandSubtitle}</span>
    </div>
  </div>

  <div class="mx-4 mb-4 rounded-lg border border-dashed border-border bg-accent p-3">
    <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{ticketTitle}</span>
    <strong class="text-xs block mt-0.5">{ticketText}</strong>
  </div>

  <nav class="flex-1 overflow-y-auto px-3 pb-4">
    {#each safeNavigation as navGroup}
      <div class="mb-4">
        <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2 px-2">{navGroup.title}</p>
        <ul class="space-y-0.5">
          {#each navGroup.items as item}
            {#if 'url' in item && item.url}
              {@const Icon = item.icon}
              <li>
                <button
                  class:active={isActive(item.url)}
                  class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors {isActive(item.url) ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'}"
                  type="button"
                  onclick={() => {
                    visit(item.url)
                  }}
                >
                  <span class="w-5 h-5 grid place-items-center shrink-0">{#if Icon}<Icon class="w-4 h-4" />{/if}</span>
                  <span class="truncate">{item.title}</span>
                </button>
              </li>
            {:else if 'items' in item && item.items}
              {#each item.items as subItem}
                {@const SubIcon = subItem.icon ?? item.icon}
                <li>
                  <button
                    class:active={isActive(subItem.url)}
                    class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors {isActive(subItem.url) ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'}"
                    type="button"
                    onclick={() => {
                      visit(subItem.url)
                    }}
                  >
                    <span class="w-5 h-5 grid place-items-center shrink-0">{#if SubIcon}<SubIcon class="w-4 h-4" />{/if}</span>
                    <span class="truncate">{subItem.title}</span>
                  </button>
                </li>
              {/each}
            {/if}
          {/each}
        </ul>
      </div>
    {/each}
  </nav>

  <!-- Bottom: user card + org switcher -->
  <div class="shrink-0 p-3">
    <div class="bg-secondary rounded-xl border border-border p-3">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-lg bg-primary grid place-items-center text-sm font-bold">{initial}</div>
        <div class="min-w-0 flex-1">
          <strong class="text-sm block truncate text-foreground">{userName}</strong>
          <span class="text-[10px] text-muted-foreground block truncate">{userEmail}</span>
        </div>
      </div>

      <!-- Org switcher — dropdown instead of redirect -->
      <details class="mt-2.5" data-disabled={isSwitching ? "true" : undefined}>
        <summary class="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium cursor-pointer select-none">
          <span class="truncate">
            {#if isSwitching}
              Đang chuyển…
            {:else if currentOrg}
              {currentOrg.name}
            {:else}
              {workspaceLabel}
            {/if}
          </span>
          <span class="ml-2 shrink-0">⌄</span>
        </summary>
        <div class="mt-1 rounded-lg border border-border bg-background overflow-hidden">
          <div class="max-h-40 overflow-y-auto">
            {#each organizations as org}
              <button
                type="button"
                class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-white/10 transition-colors {currentOrgId === org.id ? 'bg-white/15 font-semibold' : ''}"
                onclick={() => {
                  void handleSwitchOrg(org.id)
                }}
              >
                <span class="truncate flex-1">{org.name}</span>
                {#if org.org_role}
                  <span class="text-[9px] text-muted-foreground shrink-0">{formatRoleLabel(org.org_role)}</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      </details>

      {#if currentOrg}
        <!-- Project switcher -->
        <details class="mt-2.5" data-disabled={isSwitchingProject ? "true" : undefined}>
          <summary class="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium cursor-pointer select-none">
            <span class="truncate">
              {#if isSwitchingProject}
                Đang chuyển…
              {:else if currentProject}
                Dự án: {currentProject.name}
              {:else}
                Chọn dự án…
              {/if}
            </span>
            <span class="ml-2 shrink-0">⌄</span>
          </summary>
          <div class="mt-1 rounded-lg border border-border bg-background overflow-hidden">
            <div class="max-h-40 overflow-y-auto">
              {#if projects.length === 0}
                <div class="px-3 py-2 text-xs text-muted-foreground text-center">Chưa có dự án nào</div>
              {:else}
                {#each projects as project}
                  <button
                    type="button"
                    class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-white/10 transition-colors {currentProjectId === project.id ? 'bg-white/15 font-semibold' : ''}"
                    onclick={() => {
                      void handleSwitchProject(project.id)
                    }}
                  >
                    <span class="truncate flex-1">{project.name}</span>
                  </button>
                {/each}
              {/if}
            </div>
          </div>
        </details>
      {/if}

      <!-- Full org management link — only for non-admin or as secondary action -->
      {#if !isAdmin}
        <button
          class="w-full mt-2 flex items-center justify-center rounded-lg border border-border bg-secondary px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          type="button"
          onclick={() => {
            router.visit(FRONTEND_ROUTES.ORGANIZATIONS)
          }}
        >
          Xem tất cả tổ chức →
        </button>
      {/if}
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
</style>
