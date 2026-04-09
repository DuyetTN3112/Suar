<script lang="ts">
  import { page, router, Link } from '@inertiajs/svelte'
  import Avatar from '../ui/avatar.svelte'
  import AvatarImage from '../ui/avatar_image.svelte'
  import AvatarFallback from '../ui/avatar_fallback.svelte'
  import Button from '../ui/button.svelte'
  import DropdownMenu from '../ui/dropdown_menu.svelte'
  import DropdownMenuTrigger from '../ui/dropdown_menu_trigger.svelte'
  import DropdownMenuContent from '../ui/dropdown_menu_content.svelte'
  import DropdownMenuItem from '../ui/dropdown_menu_item.svelte'
  import DropdownMenuLabel from '../ui/dropdown_menu_label.svelte'
  import DropdownMenuSeparator from '../ui/dropdown_menu_separator.svelte'
  import ThemeSwitch from '@/components/theme-switch.svelte'
  import LanguageSwitcher from '@/components/ui/language_switcher.svelte'
  import NotificationDropdown from '@/components/layout/notification_dropdown.svelte'
  import ConfirmDialog from '@/components/confirm_dialog.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import { FRONTEND_ROUTES } from '@/constants'
  import type { SharedData, SharedAuthUser } from '@/types/shared_data'

  interface TranslationPayload {
    messages?: {
      user?: Record<string, unknown>
      common?: Record<string, unknown>
    }
    user?: Record<string, unknown>
    common?: Record<string, unknown>
  }

  const { t } = useTranslation()

  // WHITELIST: shell component reads $page.props for auth/context/i18n during transition period.
  const props = $derived($page.props as unknown as SharedData)
  const legacyUser = $derived((props.user as { auth?: { user?: SharedAuthUser } } | undefined)?.auth?.user)
  const translationPayload = $derived(props.translations as TranslationPayload | undefined)
  const user = $derived(props.auth?.user ?? legacyUser)
  const displayName = $derived(user ? (user.username || user.email || 'User') : '')
  const avatarUrl = $derived(user?.avatar_url || '')
  const initials = $derived(user ? (user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U') : 'SN')
  let logoutDialogOpen = $state(false)
  let isLoggingOut = $state(false)

  function handleLogoutClick(e: Event) {
    e.preventDefault()
    logoutDialogOpen = true
  }

  function confirmLogout() {
    isLoggingOut = true
    router.post(FRONTEND_ROUTES.LOGOUT, {}, {
      onError: (errors) => {
        console.error('[NavBar] Logout error:', errors)
      },
      onFinish: () => {
        // Always leave the authenticated app shell once user confirms logout.
        window.location.replace('/login')
      },
    })
  }
</script>

<header class="border-b-2 border-border bg-background px-4 py-2">
  <div class="flex items-center justify-end">

    <div class="flex items-center gap-2">
      <ThemeSwitch />

      <LanguageSwitcher
        locale={props.locale}
        supportedLocales={props.supportedLocales}
        translations={translationPayload}
      />

      <!-- Notification Dropdown -->
      <NotificationDropdown />

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="ghost" size="sm" class="h-8 gap-2 px-2">
            <Avatar class="h-7 w-7">
              {#if avatarUrl}
                <AvatarImage src={avatarUrl} alt={displayName} />
              {/if}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span class="hidden font-normal md:inline-block text-sm">
              {displayName || t('user.account', {}, 'Tài khoản')}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Link href={FRONTEND_ROUTES.PROFILE}>{t('settings.profile', {}, 'Hồ sơ')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href={FRONTEND_ROUTES.SETTINGS_ACCOUNT}>{t('settings.account', {}, 'Cài đặt tài khoản')}</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <button type="button" class="w-full text-left" onclick={handleLogoutClick}>
              {t('auth.logout', {}, 'Đăng xuất')}
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</header>

<ConfirmDialog
  bind:open={logoutDialogOpen}
  title={t('auth.logout', {}, 'Đăng xuất')}
  desc={t('auth.confirm_logout', {}, 'Bạn có chắc muốn đăng xuất?')}
  cancelBtnText={t('common.cancel', {}, 'Hủy')}
  confirmText={t('auth.logout', {}, 'Đăng xuất')}
  handleConfirm={confirmLogout}
  isLoading={isLoggingOut}
  destructive={true}
/>
