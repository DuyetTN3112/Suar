<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import { User, CreditCard, Bell, Eye, Palette } from 'lucide-svelte'

  interface Props {
    currentPath: string
  }

  const { currentPath }: Props = $props()

  const sidebarItems = [
    { title: 'Hồ sơ', href: '/settings/profile', icon: User },
    { title: 'Tài khoản', href: '/settings/account', icon: CreditCard },
    { title: 'Giao diện', href: '/settings/appearance', icon: Palette },
    { title: 'Thông báo', href: '/settings/notifications', icon: Bell },
    { title: 'Hiển thị', href: '/settings/display', icon: Eye }
  ]
</script>

<div class="col-span-3">
  <nav class="flex flex-col space-y-1">
    {#each sidebarItems as item}
      <Link
        href={item.href}
        class="flex items-center rounded-md px-3 py-2 hover:bg-muted {
          currentPath === item.href || (currentPath === '/settings' && item.href === '/settings/profile')
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
