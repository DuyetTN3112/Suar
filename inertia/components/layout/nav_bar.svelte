<script lang="ts">
  import { page, router, Link } from '@inertiajs/svelte'
  import { Menu } from 'lucide-svelte'
  import Button from '../ui/button.svelte'
  import Search from '@/components/search.svelte'
  import DropdownMenu from '../ui/dropdown_menu.svelte'
  import DropdownMenuTrigger from '../ui/dropdown_menu_trigger.svelte'
  import DropdownMenuContent from '../ui/dropdown_menu_content.svelte'
  import DropdownMenuItem from '../ui/dropdown_menu_item.svelte'
  import DropdownMenuLabel from '../ui/dropdown_menu_label.svelte'
  import DropdownMenuSeparator from '../ui/dropdown_menu_separator.svelte'
  import Avatar from '../ui/avatar.svelte'
  import AvatarImage from '../ui/avatar_image.svelte'
  import AvatarFallback from '../ui/avatar_fallback.svelte'
  import ThemeSwitch from '@/components/theme-switch.svelte'
  import LanguageSwitcher from '@/components/ui/language_switcher.svelte'
  import NotificationDropdown from './notification_dropdown.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import { getContext } from 'svelte'

  interface AuthUser {
    id?: string
    username?: string
    email?: string
  }

  interface PageProps {
    user?: {
      auth?: {
        user?: AuthUser
      }
    }
    csrfToken?: string
    locale?: string
    supportedLocales?: string[]
    [key: string]: unknown
  }

  const sidebar = getContext<{ toggleSidebar: () => void }>('sidebar')
  const { t } = useTranslation()

  const props = $derived($page.props as unknown as PageProps)
  const user = $derived(props.user?.auth?.user)
  const displayName = $derived(user ? (user.username || user.email || 'User') : '')
  const avatarUrl = $derived(user ? `/avatars/${user.username || 'unknown'}.jpg` : '')
  const initials = $derived(user ? (user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U') : 'SN')

  function handleLogout(e: Event) {
    e.preventDefault()
    router.post('/logout', {}, {
      onError: (errors) => { console.error('[NavBar] Logout error:', errors) }
    })
  }
</script>

<header class="border-b-2 border-border bg-background px-4 py-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2 lg:gap-4">
      <Button
        variant="ghost"
        size="icon"
        class="text-muted-foreground"
        onclick={sidebar?.toggleSidebar}
      >
        <Menu class="h-5 w-5" />
        <span class="sr-only">Toggle Sidebar</span>
      </Button>

      <div class="relative h-9 w-60 lg:w-80 hidden sm:flex">
        <Search placeholder={t('common.search', {}, 'Tìm kiếm...')} />
      </div>
    </div>

    <div class="flex items-center gap-2">
      <ThemeSwitch />

      <LanguageSwitcher />

      {#if user}
        <NotificationDropdown />
      {/if}

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="ghost" size="sm" class="gap-2">
            <Avatar class="h-8 w-8">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span class="font-normal hidden md:inline-block">
              {displayName || t('user.account', {}, 'Tài khoản')}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Link href="/settings/profile">{t('settings.profile', {}, 'Hồ sơ')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/settings/account">{t('settings.account', {}, 'Cài đặt tài khoản')}</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onclick={handleLogout}>
            {t('auth.logout', {}, 'Đăng xuất')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</header>
