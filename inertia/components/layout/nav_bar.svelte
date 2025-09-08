<script lang="ts">
  import { page, router, Link } from '@inertiajs/svelte'
  import { Earth, Menu, Search, Sun, Moon } from 'lucide-svelte'

  import ConfirmDialog from '@/components/confirm_dialog.svelte'
  import NotificationDropdown from '@/components/layout/notification_dropdown.svelte'
  import { FRONTEND_ROUTES } from '@/constants'
  import { useTranslation } from '@/hooks/use_translation.svelte'
  import { useTheme } from '@/stores/theme.svelte'
  import type { SharedAuthUser, SharedData } from '@/types/shared_data'

  interface Props { onMenuClick?: () => void }
  const { onMenuClick }: Props = $props()

  const pageProps = $derived(page.props as unknown as SharedData)
  const legacyUser = $derived((pageProps.user as { auth?: { user?: SharedAuthUser } } | undefined)?.auth?.user)
  const user = $derived(pageProps.auth?.user ?? legacyUser)
  const displayName = $derived(user ? ((user.username ?? user.email) ?? 'User') : 'Admin')
  const initials = $derived(displayName.charAt(0).toUpperCase())

  let logoutDialogOpen = $state(false)
  let userMenuOpen = $state(false)
  let isLoggingOut = $state(false)
  let searchValue = $state('')
  let toast = $state('')
  let toastTimer: ReturnType<typeof setTimeout> | undefined

  const { toggleTheme, theme: currentThemeStore } = useTheme()
  const { locale } = $derived(useTranslation())

  function toggleLanguage() {
    const nextLocale = locale === 'vi' ? 'en' : 'vi'
    router.visit(window.location.pathname, {
      data: { locale: nextLocale },
      preserveState: true,
      preserveScroll: true,
    })
  }

  function showToast(message: string) {
    toast = message
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { toast = '' }, 2400)
  }
  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const value = searchValue.trim()
    showToast(value ? "Demo UI: tim kiem admin voi \"${value}\"." : 'Demo UI: nhap user, to chuc hoac audit log de tim.')
  }
  function handleLogoutClick(e: Event) {
    e.preventDefault()
    logoutDialogOpen = true
    userMenuOpen = false
  }
  function confirmLogout() {
    isLoggingOut = true
    router.post(FRONTEND_ROUTES.LOGOUT, {}, {
      onError: (errors) => { console.error('[NavBar] Logout error:', errors) },
      onFinish: () => { window.location.replace('/login') },
    })
  }
</script>

<header class="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-border">
  <div class="flex items-center gap-4 px-6 py-3">
    <button class="lg:hidden w-10 h-10 grid place-items-center rounded-full border border-border hover:bg-accent transition-colors" type="button" onclick={() => onMenuClick?.()}>
      <Menu class="w-5 h-5" />
    </button>
    <div class="flex-1 max-w-xl mr-2">
      <label class="relative flex items-center">
        <Search class="absolute left-3 w-5 h-5 text-muted-foreground" />
        <input bind:value={searchValue} placeholder="Tim user, to chuc, audit log, review..." onkeydown={handleSearchKeydown} class="w-full pl-10 pr-12 py-2.5 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" />
        <kbd class="absolute right-3 text-[10px] font-medium text-muted-foreground border border-border rounded px-1.5 py-0.5 hidden sm:block">Cmd+K</kbd>
      </label>
    </div>
    <div class="ml-auto flex items-center gap-2">
      <button
        class="w-10 h-10 grid place-items-center rounded-full border border-border hover:bg-accent transition-colors"
        type="button"
        aria-label="Theme"
        onclick={toggleTheme}
      >
        {#if $currentThemeStore === 'dark'}
          <Sun class="w-4 h-4 text-yellow-500" />
        {:else}
          <Moon class="w-4 h-4 text-slate-700" />
        {/if}
      </button>
      <button
        class="w-10 h-10 grid place-items-center rounded-full border border-border hover:bg-accent transition-colors relative"
        type="button"
        aria-label="Language"
        onclick={toggleLanguage}
      >
        <Earth class="w-4 h-4" />
        <span class="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[8px] font-bold px-1 rounded-sm uppercase tracking-wider">
          {locale}
        </span>
      </button>
      <NotificationDropdown class="w-10! h-10! rounded-full! border border-border hover:bg-accent" />
      <div class="relative">
        <button class="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-border hover:bg-accent" type="button" onclick={() => { userMenuOpen = !userMenuOpen }}>
          <span class="w-8 h-8 grid place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{initials}</span>
          <span class="text-sm font-medium hidden sm:block">{displayName}</span>
          <span class="text-xs">v</span>
        </button>
        {#if userMenuOpen}
        <div class="absolute top-full right-0 mt-1 w-56 rounded-xl border border-border bg-background shadow-suar-sm p-2 z-50">
          <strong class="block px-3 py-2 text-sm font-medium">{displayName}</strong>
          <Link href={FRONTEND_ROUTES.PROFILE} class="block px-3 py-2 text-sm rounded-lg hover:bg-accent" onclick={() => { userMenuOpen = false }}>Ho so</Link>
          <Link href={FRONTEND_ROUTES.SETTINGS_ACCOUNT} class="block px-3 py-2 text-sm rounded-lg hover:bg-accent" onclick={() => { userMenuOpen = false }}>Cai dat tai khoan</Link>
          <button type="button" onclick={handleLogoutClick} class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-accent">Dang xuat</button>
        </div>
        {/if}
      </div>
    </div>
  </div>
</header>

{#if toast}
  <div class="fixed right-6 bottom-6 z-50 max-w-sm bg-foreground text-background rounded-xl px-4 py-3 shadow-suar-sm text-sm font-medium">{toast}</div>
{/if}

<ConfirmDialog bind:open={logoutDialogOpen} title="Dang xuat" desc="Ban co chac muon dang xuat?" cancelBtnText="Huy" confirmText="Dang xuat" handleConfirm={confirmLogout} isLoading={isLoggingOut} destructive={true} />

