<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'
  import {
    BadgeCheck,
    Bell,
    ChevronsUpDown,
    CreditCard,
    Sparkles,
  } from 'lucide-svelte'
  import Avatar from '@/components/ui/avatar.svelte'
  import AvatarFallback from '@/components/ui/avatar_fallback.svelte'
  import DropdownMenu from '@/components/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '@/components/ui/dropdown_menu_content.svelte'
  import DropdownMenuGroup from '@/components/ui/dropdown_menu_group.svelte'
  import DropdownMenuItem from '@/components/ui/dropdown_menu_item.svelte'
  import DropdownMenuLabel from '@/components/ui/dropdown_menu_label.svelte'
  import DropdownMenuSeparator from '@/components/ui/dropdown_menu_separator.svelte'
  import DropdownMenuTrigger from '@/components/ui/dropdown_menu_trigger.svelte'
  import SidebarMenu from '@/components/ui/sidebar/sidebar_menu.svelte'
  import SidebarMenuItem from '@/components/ui/sidebar/sidebar_menu_item.svelte'
  import SidebarMenuButton from '@/components/ui/sidebar/sidebar_menu_button.svelte'
  import ConfirmDialog from '@/components/confirm_dialog.svelte'
  import { LogOut } from 'lucide-svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import { getContext } from 'svelte'

  type Props = {
    user: {
      name: string
      email: string
    }
  }

  const { user }: Props = $props()

  const sidebar = getContext<{ isMobile: boolean }>('sidebar')
  const { t } = useTranslation()
  let logoutDialogOpen = $state(false)
  let isLoggingOut = $state(false)

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || name.substring(0, 2).toUpperCase()
  }

  const initials = $derived(getInitials(user.name))

  function handleLogoutClick(e: Event) {
    e.preventDefault()
    logoutDialogOpen = true
  }

  function confirmLogout() {
    isLoggingOut = true
    router.post('/logout', {}, {
      onError: (errors) => {
        console.error('[NavUser] Logout error:', errors)
      },
      onFinish: () => {
        // Always leave the authenticated app shell once user confirms logout.
        window.location.replace('/login')
      },
    })
  }
</script>

<SidebarMenu>
  <SidebarMenuItem>
    <DropdownMenu>
      <DropdownMenuTrigger>
        <SidebarMenuButton
          size="lg"
          class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          tooltip={user.name}
        >
          <Avatar class="h-8 w-8 rounded-lg !block">
            <AvatarFallback class="rounded-lg !block">{initials}</AvatarFallback>
          </Avatar>
          <div class="grid flex-1 text-left text-sm leading-tight">
            <span class="truncate font-semibold">{user.name}</span>
            <span class="truncate text-xs">{user.email}</span>
          </div>
          <ChevronsUpDown class="ml-auto size-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        class="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        side={sidebar?.isMobile ? 'bottom' : 'right'}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel class="p-0 font-normal">
          <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar class="h-8 w-8 rounded-lg">
              <AvatarFallback class="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-semibold">{user.name}</span>
              <span class="truncate text-xs">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Sparkles />
            {t('user.upgrade_to_pro', {}, 'Nâng cấp lên Pro')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Link href="/settings/account">
              <BadgeCheck />
              {t('settings.account', {}, 'Tài khoản')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/settings">
              <CreditCard />
              {t('user.billing', {}, 'Thanh toán')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/settings/notifications">
              <Bell />
              {t('settings.notifications', {}, 'Thông báo')}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <button type="button" class="flex w-full items-center text-left" onclick={handleLogoutClick}>
            <LogOut class="mr-2 h-4 w-4" />
            {t('auth.logout', {}, 'Đăng xuất')}
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </SidebarMenuItem>
</SidebarMenu>

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
