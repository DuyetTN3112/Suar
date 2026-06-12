<script lang="ts">
  import { page, router } from '@inertiajs/svelte'

  import ControlSidebarNavigation from '@/apps/org/shared/components/layout/control_sidebar_navigation.svelte'
  import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'
  import { formatRoleLabel } from '@/apps/org/shared/lib/access_ui'
  import { uiToast } from '@/apps/org/shared/lib/ui_toast'
  import { requestOrganizationSwitch, requestProjectSwitch } from '@/apps/org/shared/lib/workspace_switcher'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'
  import type { SharedAuthUser, SharedAuthOrganization, SharedData } from '@/apps/org/shared/types/shared_data'
  import {
    isNavUrlActive,
    resolveBrowserCurrentUrl,
  } from '@/apps/org/shared/components/navigation_helpers'
  import type { NavGroup } from '@/apps/org/shared/components/navigation_types'

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
  const currentUrl = $derived(resolveBrowserCurrentUrl(page.url))
  const userName = $derived((authUser?.username ?? authUser?.email) ?? 'User')
  const userEmail = $derived(authUser?.email ?? 'workspace@suar.local')
  const initial = $derived(userName.charAt(0).toUpperCase())
  const isAdmin = $derived(Boolean(authUser?.isAdmin))
  const { t } = $derived(useTranslation())
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

  function surfaceForPath(path: string): 'admin' | 'org' | 'user' {
    if (path.startsWith('/admin')) return 'admin'
    if (path.startsWith('/org')) return 'org'
    return 'user'
  }

  function visitWorkspaceRedirect(targetUrl: string, onFinish: () => void) {
    if (surfaceForPath(targetUrl) !== surfaceForPath(currentUrl)) {
      window.location.assign(targetUrl)
      return
    }

    router.visit(targetUrl, {
      preserveState: false,
      preserveScroll: false,
      replace: true,
      onFinish,
    })
  }

  // ── Org switch: reload current page, no redirect ──
  let isSwitching = $state(false)
  async function handleSwitchOrg(orgId: string) {
    if (!orgId || isSwitching || orgId === currentOrgId) return
    isSwitching = true
    try {
      const result = await requestOrganizationSwitch({
        organizationId: orgId,
        currentPath: currentUrl,
      })
      uiToast.success(result.message ?? t('common.switch_organization_success', {}, 'Organization switched'))
      visitWorkspaceRedirect(result.redirect ?? currentUrl, () => {
        isSwitching = false
      })
    } catch (error) {
      uiToast.error(error instanceof Error ? error.message : t('common.switch_organization_error', {}, 'Unable to switch organization'))
      isSwitching = false
    }
  }

  // ── Project switch ──
  const currentProjectId = $derived(authUser?.current_project?.id ?? null)
  const currentProject = $derived(authUser?.current_project ?? null)
  const projects = $derived((authUser as unknown as { projects?: { id: string; name: string }[] } | null)?.projects ?? [])
  
  let isSwitchingProject = $state(false)
  async function handleSwitchProject(projectId: string) {
    if (!projectId || isSwitchingProject || projectId === currentProjectId) return
    isSwitchingProject = true
    try {
      const result = await requestProjectSwitch({
        projectId,
        currentPath: currentUrl,
      })
      uiToast.success(result.message ?? t('common.switch_project_success', {}, 'Project switched'))
      visitWorkspaceRedirect(result.redirect ?? currentUrl, () => {
        isSwitchingProject = false
      })
    } catch (error) {
      uiToast.error(error instanceof Error ? error.message : t('common.switch_project_error', {}, 'Unable to switch project'))
      isSwitchingProject = false
    }
  }
</script>

{#if open}
  <button
    type="button"
    aria-label="Close navigation"
    class="fixed inset-0 z-40 block bg-black/20 md:hidden"
    onclick={() => onClose?.()}
  ></button>
{/if}

<aside
  class:open
  data-open={open ? 'true' : 'false'}
  class="control-sidebar w-72 shrink-0 h-screen sticky top-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border"
>
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

  <ControlSidebarNavigation navigation={safeNavigation} {currentUrl} onNavigate={visit} />

  <!-- Bottom: user card + org switcher -->
  <div class="shrink-0 p-3">
    <div class="bg-secondary rounded-xl border border-border p-3">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-lg bg-primary text-primary-foreground grid place-items-center text-sm font-bold">{initial}</div>
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
              {t('common.switching', {}, 'Switching...')}
            {:else if currentOrg}
              {currentOrg.name}
            {:else}
              {workspaceLabel}
            {/if}
          </span>
          <span class="ml-2 shrink-0">⌄</span>
        </summary>
        <div class="mt-1 rounded-lg border border-border bg-popover text-popover-foreground overflow-hidden">
          <div class="max-h-40 overflow-y-auto">
            {#each organizations as org}
              <button
                type="button"
                class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-accent transition-colors {currentOrgId === org.id ? 'bg-accent font-semibold' : ''}"
                onclick={() => {
                  void handleSwitchOrg(org.id)
                }}
              >
                <span class="truncate flex-1">{org.name}</span>
                {#if org.org_role}
                  <span class="text-[9px] text-muted-foreground shrink-0">{formatRoleLabel(org.org_role, t)}</span>
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
                {t('common.switching', {}, 'Switching...')}
              {:else if currentProject}
                {t('common.project_prefix', {}, 'Project')}: {currentProject.name}
              {:else}
                {t('common.select_project', {}, 'Select project...')}
              {/if}
            </span>
            <span class="ml-2 shrink-0">⌄</span>
          </summary>
          <div class="mt-1 rounded-lg border border-border bg-popover text-popover-foreground overflow-hidden">
            <div class="max-h-40 overflow-y-auto">
              {#if projects.length === 0}
                <div class="px-3 py-2 text-xs text-muted-foreground text-center">{t('common.no_projects', {}, 'No projects yet')}</div>
              {:else}
                {#each projects as project}
                  <button
                    type="button"
                    class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-accent transition-colors {currentProjectId === project.id ? 'bg-accent font-semibold' : ''}"
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
          {t('common.view_all_organizations', {}, 'View all organizations')} →
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
    .control-sidebar[data-open="true"] {
      transform: translateX(0);
    }
  }
</style>
