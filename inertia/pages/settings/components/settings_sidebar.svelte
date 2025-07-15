<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import { User, CreditCard, Bell, Eye, Palette } from 'lucide-svelte'

  import { FRONTEND_ROUTES } from '@/constants'

  interface Props {
    currentPath: string
  }

  const { currentPath }: Props = $props()

  const sidebarItems = [
    { title: 'Hồ sơ', href: FRONTEND_ROUTES.SETTINGS_PROFILE, icon: User },
    { title: 'Tài khoản', href: FRONTEND_ROUTES.SETTINGS_ACCOUNT, icon: CreditCard },
    { title: 'Giao diện', href: FRONTEND_ROUTES.SETTINGS_APPEARANCE, icon: Palette },
    { title: 'Thông báo', href: FRONTEND_ROUTES.SETTINGS_NOTIFICATIONS, icon: Bell },
    { title: 'Hiển thị', href: FRONTEND_ROUTES.SETTINGS_DISPLAY, icon: Eye }
  ]
</script>

<div class="col-span-3">
  <nav class="flex flex-col space-y-1">
    {#each sidebarItems as item}
      <Link
        href={item.href}
        class="flex items-center rounded-md px-3 py-2 hover:bg-muted {
          currentPath === item.href || (currentPath === FRONTEND_ROUTES.SETTINGS_ROOT && item.href === FRONTEND_ROUTES.SETTINGS_PROFILE)
            ? 'bg-muted font-medium text-foreground'
            : 'text-muted-foreground'
        }"
      >
        {@const IconComponent = item.icon}
        <IconComponent class="mr-2 h-4 w-4" />
        {item.title}
      </Link>
    {/each}
  </nav>
</div>
