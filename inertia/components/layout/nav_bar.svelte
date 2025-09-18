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
