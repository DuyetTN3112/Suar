<script lang="ts">
  import { page, router, Link } from '@inertiajs/svelte'
  import { Check, Earth, Laptop, Menu, Moon, Search, Sun } from 'lucide-svelte'

  import ConfirmDialog from '@/apps/user/shared/components/confirm_dialog.svelte'
  import NotificationDropdown from '@/apps/user/shared/components/layout/notification_dropdown.svelte'
  import { FRONTEND_ROUTES, THEME_OPTIONS } from '@/apps/user/shared/constants'
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'
  import { uiToast } from '@/apps/user/shared/lib/ui_toast'
  import { useTheme, type Theme } from '@/apps/user/shared/stores/theme.svelte'
  import type { SharedAuthUser, SharedData } from '@/apps/user/shared/types/shared_data'
  import { buildSearchPageUrl } from '@/apps/shared/navigation/shell_search_links'
  import DropdownMenu from '@/apps/user/shared/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '@/apps/user/shared/ui/dropdown_menu_content.svelte'
  import DropdownMenuItem from '@/apps/user/shared/ui/dropdown_menu_item.svelte'
  import DropdownMenuTrigger from '@/apps/user/shared/ui/dropdown_menu_trigger.svelte'

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

  const { setTheme, theme: currentThemeStore } = useTheme()
  const { locale, t } = $derived(useTranslation())

  function toggleLanguage() {
    const nextLocale = locale === 'vi' ? 'en' : 'vi'
    const currentUrl = new URL(window.location.href)
    currentUrl.searchParams.set('locale', nextLocale)

    router.visit(`${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function handleSearchSubmit(e: SubmitEvent) {
    e.preventDefault()
    const value = searchValue.trim()
    router.visit(buildSearchPageUrl('app', value))
  }
  function setThemePreference(value: Theme) {
    setTheme(value)
  }
  function themeOptionLabel(value: Theme) {
    if (value === 'light') return t('settings.settings.theme_light', {}, 'Light')
    if (value === 'dark') return t('settings.settings.theme_dark', {}, 'Dark')
    return t('settings.settings.theme_system', {}, 'System')
  }
  function handleLogoutClick(e: Event) {
    e.preventDefault()
    logoutDialogOpen = true
    userMenuOpen = false
  }
  function confirmLogout() {
    isLoggingOut = true
    router.post(FRONTEND_ROUTES.LOGOUT, {}, {
      onSuccess: () => {
        window.location.replace('/login')
      },
      onError: (errors) => {
        console.error('[NavBar] Logout error:', errors)
        uiToast.error(t('common.logout_failed', {}, 'Logout failed'))
      },
      onFinish: () => {
        isLoggingOut = false
        logoutDialogOpen = false
      },
    })
  }
</script>

<header class="sticky top-0 z-20 border-b border-border bg-card/95 text-card-foreground backdrop-blur-md">
  <div class="flex items-center gap-4 px-6 py-3">
    <button class="lg:hidden w-10 h-10 grid place-items-center rounded-full border border-border hover:bg-accent transition-colors" type="button" aria-label={t('common.open_navigation', {}, 'Open navigation')} onclick={() => onMenuClick?.()}>
      <Menu class="w-5 h-5" />
    </button>
    <form class="flex-1 max-w-xl mr-2" onsubmit={handleSearchSubmit}>
      <label class="relative flex items-center">
        <Search class="absolute left-3 w-5 h-5 text-muted-foreground" />
        <input bind:value={searchValue} placeholder={t('common.search_everything', {}, 'Search everything...')} class="w-full pl-10 pr-4 py-2.5 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background" />
      </label>
    </form>
    <div class="ml-auto flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          class="w-10 h-10 grid place-items-center rounded-full border border-border hover:bg-accent transition-colors"
          aria-label={t('common.theme', {}, 'Theme')}
        >
          {#if $currentThemeStore === 'dark'}
            <Moon class="w-4 h-4 text-muted-foreground" />
          {:else if $currentThemeStore === 'system'}
            <Laptop class="w-4 h-4 text-muted-foreground" />
          {:else}
            <Sun class="w-4 h-4 text-primary" />
          {/if}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="min-w-[180px] rounded-xl border border-border shadow-suar-sm">
          {#each THEME_OPTIONS as option}
            <DropdownMenuItem onclick={() => { setThemePreference(option.value) }} class="gap-2">
              {#if option.value === 'light'}
                <Sun class="h-4 w-4" />
              {:else if option.value === 'dark'}
                <Moon class="h-4 w-4" />
              {:else}
                <Laptop class="h-4 w-4" />
              {/if}
              <span>{themeOptionLabel(option.value)}</span>
              <Check class={$currentThemeStore === option.value ? 'ml-auto h-4 w-4' : 'ml-auto h-4 w-4 invisible'} />
            </DropdownMenuItem>
          {/each}
        </DropdownMenuContent>
      </DropdownMenu>
      <button
        class="w-10 h-10 grid place-items-center rounded-full border border-border hover:bg-accent transition-colors relative"
        type="button"
        aria-label={t('common.language', {}, 'Language')}
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
        <div class="absolute top-full right-0 mt-1 w-56 rounded-xl border border-border bg-popover text-popover-foreground shadow-suar-sm p-2 z-50">
          <strong class="block px-3 py-2 text-sm font-medium">{displayName}</strong>
          <Link href={FRONTEND_ROUTES.PROFILE} class="block px-3 py-2 text-sm rounded-lg hover:bg-accent" onclick={() => { userMenuOpen = false }}>{t('common.profile', {}, 'Profile')}</Link>
          <Link href={FRONTEND_ROUTES.SETTINGS_ACCOUNT} class="block px-3 py-2 text-sm rounded-lg hover:bg-accent" onclick={() => { userMenuOpen = false }}>{t('common.account_settings', {}, 'Account settings')}</Link>
          <button type="button" onclick={handleLogoutClick} class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-accent">{t('common.logout', {}, 'Logout')}</button>
        </div>
        {/if}
      </div>
    </div>
  </div>
</header>

<ConfirmDialog bind:open={logoutDialogOpen} title={t('common.logout_confirm_title', {}, 'Logout')} desc={t('common.logout_confirm_description', {}, 'Are you sure you want to log out?')} cancelBtnText={t('common.cancel', {}, 'Cancel')} confirmText={t('common.logout', {}, 'Logout')} handleConfirm={confirmLogout} isLoading={isLoggingOut} destructive={true} />
