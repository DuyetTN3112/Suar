<script lang="ts">
  import { page, router, Link } from '@inertiajs/svelte'
  import { Bell } from 'lucide-svelte'
  import Button from '../ui/button.svelte'
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
  import { useTranslation } from '@/stores/translation.svelte'

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

  const { t } = useTranslation()

  const props = $derived($page.props as unknown as PageProps)
  const user = $derived(props.user?.auth?.user)
  const displayName = $derived(user ? (user.username || user.email || 'User') : '')
  const avatarUrl = $derived(user ? `/avatars/${user.username || 'unknown'}.jpg` : '')
  const initials = $derived(user ? (user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U') : 'SN')

  function handleLogout(e: Event) {
    e.preventDefault()
    
    if (!confirm(t('auth.confirm_logout', {}, 'Bạn có chắc muốn đăng xuất?'))) {
      return
    }
    
    router.post('/logout', {}, {
      onSuccess: () => {
        window.location.href = '/login'
      },
      onError: (errors) => {
        console.error('[NavBar] Logout error:', errors)
      }
    })
  }
</script>

<header class="border-b-2 border-border bg-background px-4 py-3">
  <div class="flex items-center justify-between">
    <div>
      <Link href="/" class="text-lg font-semibold">Suar</Link>
    </div>

    <div class="flex items-center gap-2">
      <ThemeSwitch />

      <LanguageSwitcher />

      <!-- Notification Icon -->
      <Button variant="ghost" size="icon" class="relative">
        <Bell class="h-5 w-5" />
        <!-- Badge for unread count (optional) -->
        <span class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          3
        </span>
      </Button>

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
          <DropdownMenuItem>
            <button type="button" class="w-full text-left" onclick={handleLogout}>
              {t('auth.logout', {}, 'Đăng xuất')}
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</header>
