<script lang="ts">
  import { page, router, Link } from '@inertiajs/svelte'

  import Avatar from '@/components/ui/avatar.svelte'
  import AvatarFallback from '@/components/ui/avatar_fallback.svelte'
  import AvatarImage from '@/components/ui/avatar_image.svelte'
  import Button from '@/components/ui/button.svelte'
  import DropdownMenu from '@/components/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '@/components/ui/dropdown_menu_content.svelte'
  import DropdownMenuGroup from '@/components/ui/dropdown_menu_group.svelte'
  import DropdownMenuItem from '@/components/ui/dropdown_menu_item.svelte'
  import DropdownMenuLabel from '@/components/ui/dropdown_menu_label.svelte'
  import DropdownMenuSeparator from '@/components/ui/dropdown_menu_separator.svelte'
  import DropdownMenuShortcut from '@/components/ui/dropdown_menu_shortcut.svelte'
  import DropdownMenuTrigger from '@/components/ui/dropdown_menu_trigger.svelte'
  import type { SharedData } from '@/types/shared_data'

  // WHITELIST: shell component reads page.props for authenticated user menu during transition period.
  const props = $derived(page.props as unknown as SharedData)
  const user = $derived(props.auth?.user)

  // Tạo tên hiển thị từ thông tin người dùng
  const displayName = $derived(user ? ((user.username ?? user.email) ?? 'User') : '')
  const userEmail = $derived(user?.email ?? '')
  const avatarUrl = $derived(user?.avatar_url ?? '')
  const initials = $derived(user ? ((user.username?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase()) ?? 'U') : '!')

  // Di chuyển console.error vào effect
  $effect(() => {
    if (!user && import.meta.env.MODE === 'development') {
      console.error('ProfileDropdown: Không có thông tin người dùng')
    }
  })
</script>

{#if !user}
  <Button variant="ghost" class="relative h-8 w-8 rounded-full" disabled>
    <Avatar class="h-8 w-8">
      <AvatarFallback>!</AvatarFallback>
    </Avatar>
  </Button>
{:else}
  <DropdownMenu>
    <DropdownMenuTrigger>
      <Button variant="ghost" class="relative h-8 w-8 rounded-full">
        <Avatar class="h-8 w-8">
          {#if avatarUrl}
            <AvatarImage src={avatarUrl} alt={displayName} />
          {/if}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent class="w-56" align="end">
      <DropdownMenuLabel class="font-normal">
        <div class="flex flex-col space-y-1">
          <p class="text-sm leading-none font-medium">{displayName}</p>
          <p class="text-muted-foreground text-xs leading-none">
            {userEmail}
          </p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem>
          <Link href="/profile">
            Hồ sơ
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/settings">
            Thanh toán
            <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/settings">
            Cài đặt
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>Nhóm mới</DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onclick={(e: MouseEvent) => {
          e.preventDefault()
          router.post('/logout', {}, {
            onError: (errors) => { console.error('[ProfileDropdown] Logout error:', errors) },
          })
        }}
      >
        Đăng xuất
        <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
{/if}
