<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import { Menu } from 'lucide-svelte'

  import Button from '@/components/ui/button.svelte'
  import DropdownMenu from '@/components/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '@/components/ui/dropdown_menu_content.svelte'
  import DropdownMenuItem from '@/components/ui/dropdown_menu_item.svelte'
  import DropdownMenuTrigger from '@/components/ui/dropdown_menu_trigger.svelte'

  import { cn } from '$lib/utils-svelte'

  interface TopNavLink {
    title: string
    href: string
    isActive: boolean
    disabled?: boolean
  }

  interface TopNavProps {
    class?: string
    links: TopNavLink[]
  }

  const { class: className, links }: TopNavProps = $props()

</script>

<div class="md:hidden">
  <DropdownMenu>
    <DropdownMenuTrigger>
      <Button size="icon" variant="outline">
        <Menu />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent side="bottom" align="start">
      {#each links as link}
        <DropdownMenuItem>
          <Link
            href={link.disabled ? '#' : link.href}
            preserveScroll={true}
            preserveState={true}
            aria-disabled={link.disabled}
            class={cn(!link.isActive && 'text-muted-foreground', link.disabled && 'pointer-events-none opacity-50')}
          >
            {link.title}
          </Link>
        </DropdownMenuItem>
      {/each}
    </DropdownMenuContent>
  </DropdownMenu>
</div>

<nav
  class={cn(
    'hidden items-center space-x-4 md:flex lg:space-x-6',
    className
  )}
>
  {#each links as link}
    <Link
      href={link.disabled ? '#' : link.href}
      preserveScroll={true}
      preserveState={true}
      aria-disabled={link.disabled}
      class={cn(
        'hover:text-primary text-sm font-medium transition-colors',
        !link.isActive && 'text-muted-foreground',
        link.disabled && 'pointer-events-none opacity-50'
      )}
    >
      {link.title}
    </Link>
  {/each}
</nav>
